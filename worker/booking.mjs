import { bookingError, daySlots, validateSlot, overlaps, TIME_ZONE } from './booking-time.mjs';
import { GoogleCalendar, eventIdFor, calendarConfigured, smsConfigured, sendBookingSms } from './booking-providers.mjs';
import { validate, readBody } from './contact.mjs';
import { createHash } from 'node:crypto';

export const bookingJson = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});
const unavailable = () => bookingError(503, 'Rezerwacje są chwilowo niedostępne. Napisz na kontakt@inddev.pl.');
const safeFailure = error => bookingJson({ ok: false, message: error.status ? error.message : 'Nie udało się potwierdzić operacji. Spróbuj ponownie lub napisz na kontakt@inddev.pl.' }, error.status || 503);

export async function bookings(request, env, verifyFetch = fetch) {
  try {
    const url = new URL(request.url);
    const slots = url.pathname === '/api/booking/slots';
    if (request.method !== (slots ? 'GET' : 'POST')) return bookingJson({ ok: false, message: 'Niedozwolona metoda.' }, 405);
    if (!slots && request.headers.get('origin') !== 'https://www.inddev.pl') throw bookingError(403, 'Wyślij formularz bezpośrednio ze strony IndDev.');
    if (!slots && request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw bookingError(415, 'Nieobsługiwany format.');
    if (!calendarConfigured(env) || !smsConfigured(env) || !env.BOOKINGS?.idFromName || !env.BOOKING_LIMITER?.limit || (!slots && !env.TURNSTILE_SECRET)) throw unavailable();
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) throw bookingError(400, 'Nieprawidłowe żądanie.');
    const { success } = await env.BOOKING_LIMITER.limit({ key: ip });
    if (!success) throw bookingError(429, 'Zbyt wiele prób. Poczekaj minutę.');
    const stub = env.BOOKINGS.get(env.BOOKINGS.idFromName('inddev-calendar-v1'));
    if (slots) return await stub.fetch(new Request('https://booking.internal/slots?date=' + encodeURIComponent(url.searchParams.get('date') || '')));
    const body = await readBody(request);
    const clean = validate(body);
    let verification;
    try {
      const response = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: clean.token }), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Verification unavailable');
      verification = await response.json();
    } catch { throw bookingError(503, 'Weryfikacja antyspamowa jest chwilowo niedostępna. Spróbuj ponownie.'); }
    if (verification?.success !== true || verification.hostname !== 'www.inddev.pl' || verification.action !== 'booking') throw bookingError(422, 'Weryfikacja wygasła lub nie powiodła się. Spróbuj ponownie.');
    const { token: _token, ...data } = clean;
    if (typeof body.date !== 'string' || typeof body.time !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{2}:\d{2}$/.test(body.time)) throw bookingError(422, 'Wybierz datę i godzinę.');
    return await stub.fetch(new Request('https://booking.internal/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, date: body.date, time: body.time }) }));
  } catch (error) { return safeFailure(error); }
}

function fingerprint(data) {
  return createHash('sha256').update(JSON.stringify([data.name, data.company, data.email, data.phone, data.date, data.time])).digest('hex');
}
function receipt(record) {
  return { ok: true, requestId: record.requestId, date: record.date, time: record.time, start: record.start, end: record.end, timeZone: TIME_ZONE };
}
export class BookingCalendar {
  constructor(ctx, env, dependencies = {}) {
    this.storage = ctx.storage; this.env = env;
    this.calendar = dependencies.calendar || new GoogleCalendar(env);
    this.sms = dependencies.sms || ((record) => sendBookingSms(env, record));
    this.now = dependencies.now || Date.now; this.queue = Promise.resolve();
  }
  exclusive(task) {
    const result = this.queue.then(task);
    this.queue = result.catch(() => {});
    return result;
  }
  fetch(request) {
    return this.exclusive(async () => {
      try {
        const url = new URL(request.url);
        if (url.pathname === '/slots') return bookingJson(await this.slots(url.searchParams.get('date')));
        if (url.pathname === '/book') return bookingJson(await this.book(await request.json()));
        return bookingJson({ ok: false }, 404);
      } catch (error) { return safeFailure(error); }
    });
  }
  async slots(date) {
    const slots = daySlots(date, this.now());
    if (!slots.length) return { ok: true, date, timeZone: TIME_ZONE, slots: [] };
    const busy = await this.calendar.busy(slots[0].start, slots.at(-1).end);
    const holds = await this.storage.list({ prefix: 'hold:' + date + ':' });
    await Promise.all([...holds].map(async ([key, requestId]) => {
      if (await this.releaseCancelledHold(key, requestId)) holds.delete(key);
    }));
    return { ok: true, date, timeZone: TIME_ZONE, slots: slots.filter(slot => !holds.has('hold:' + date + ':' + slot.time) && !overlaps(slot, busy)).map(slot => slot.time) };
  }
  async releaseCancelledHold(key, requestId) {
    const record = await this.storage.get('booking:' + requestId);
    if (!record || record.state !== 'confirmed') return false;
    const event = await this.calendar.find(record.eventId);
    if (!event || event.status === 'cancelled' || Date.parse(event.start?.dateTime) !== Date.parse(record.start) || Date.parse(event.end?.dateTime) !== Date.parse(record.end)) {
      await this.storage.delete(key);
      return true;
    }
    return false;
  }
  async book(data) {
    const key = 'booking:' + data.requestId;
    let record = await this.storage.get(key);
    if (record) {
      if (record.fingerprint !== fingerprint(data)) throw bookingError(409, 'Dane tej rezerwacji zmieniły się. Sprawdź poprzedni wynik przed nową rezerwacją.');
      if (record.state === 'confirmed') { await this.notify(record); return receipt(record); }
      if (record.state === 'failed') throw bookingError(409, 'Ten termin nie został zarezerwowany. Wybierz termin ponownie.');
      await this.complete(record, true);
      return receipt(record);
    }
    const slot = validateSlot(data.date, data.time, this.now());
    const holdKey = 'hold:' + data.date + ':' + data.time;
    const holder = await this.storage.get(holdKey);
    if (holder && !(await this.releaseCancelledHold(holdKey, holder))) throw bookingError(409, 'Ten termin jest już zajęty. Wybierz inną godzinę.');
    if (overlaps(slot, await this.calendar.busy(slot.start, slot.end))) throw bookingError(409, 'Ten termin jest już zajęty. Wybierz inną godzinę.');
    record = { ...data, ...slot, fingerprint: fingerprint(data), eventId: eventIdFor(data.requestId), state: 'pending', smsState: 'pending', createdAt: this.now(), attempts: 0 };
    await this.storage.transaction(async txn => {
      await txn.put(key, record); await txn.put(holdKey, data.requestId);
      await this.storage.setAlarm(this.now() + 60000);
    });
    await this.complete(record, false);
    return receipt(record);
  }
  async complete(record, recovering) {
    try {
      let event = recovering ? await this.calendar.find(record.eventId) : null;
      if (!event && recovering && overlaps(record, await this.calendar.busy(record.start, record.end))) {
        throw bookingError(503, 'Nie możemy jeszcze potwierdzić wyniku. Ponów próbę dla tego samego terminu lub napisz e-mail.');
      }
      if (!event) event = await this.calendar.insert(record);
      if (!event || event.id !== record.eventId || event.status === 'cancelled' || event.extendedProperties?.private?.inddevBooking !== record.requestId || Date.parse(event.start?.dateTime) !== Date.parse(record.start) || Date.parse(event.end?.dateTime) !== Date.parse(record.end)) throw bookingError(503, 'Nie możemy potwierdzić wyniku. Ponów próbę dla tego samego terminu lub napisz e-mail.');
      record.state = 'confirmed';
      await this.storage.transaction(async txn => {
        await txn.put('booking:' + record.requestId, record);
        // Keep the hold until Google confirms cancellation or movement, even if freeBusy lags.
      });
      await this.notify(record);
    } catch (error) {
      if (error.definitive && !recovering) await this.fail(record);
      throw error;
    }
  }
  async fail(record) {
    record.state = 'failed';
    await this.storage.transaction(async txn => {
      await txn.put('booking:' + record.requestId, record);
      await txn.delete('hold:' + record.date + ':' + record.time);
    });
  }
  async notify(record) {
    if (record.smsState !== 'pending') return;
    // Persist before network I/O. An ambiguous SMS response never triggers another send.
    record.smsState = 'sending';
    await this.storage.put('booking:' + record.requestId, record);
    record.smsState = await this.sms(record).catch(() => 'unknown');
    await this.storage.put('booking:' + record.requestId, record);
  }
  alarm() {
    return this.exclusive(async () => {
      const records = await this.storage.list({ prefix: 'booking:' });
      for (const record of records.values()) {
        if (record.state === 'pending' && record.attempts < 5 && Date.parse(record.start) > this.now()) {
          record.attempts++;
          await this.storage.put('booking:' + record.requestId, record);
          try { await this.complete(record, true); } catch { /* Retain uncertain holds; never announce success. */ }
        } else if (record.state === 'confirmed' && record.smsState === 'pending') await this.notify(record);
        // Technical receipts expire 30 days after the appointment. Calendar retention is managed by the owner.
        if (Date.parse(record.end) + 30 * 86400000 < this.now()) {
          await this.storage.delete(['booking:' + record.requestId, 'hold:' + record.date + ':' + record.time]);
        }
      }
      const remaining = await this.storage.list({ prefix: 'booking:' });
      const retrySoon = [...remaining.values()].some(record => record.state === 'pending' && record.attempts < 5 && Date.parse(record.start) > this.now());
      if (remaining.size) await this.storage.setAlarm(this.now() + (retrySoon ? 60000 : 86400000));
    });
  }
}
