import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookingCalendar, bookings } from '../worker/booking.mjs';
import { daySlots, slotStart, validateSlot, overlaps } from '../worker/booking-time.mjs';
import { GoogleCalendar, sendBookingSms, zadarmaAuthorization } from '../worker/booking-providers.mjs';

const now = Date.parse('2026-10-09T06:00:00Z');
const data = { name: 'Jan Kowalski', company: 'Firma', email: 'jan@example.com', phone: '', date: '2026-10-12', time: '10:00', requestId: '12345678-1234-4123-8123-123456789abc' };
function storageMock() {
  const values = new Map();
  const storage = {
    alarm: null,
    get: async key => globalThis.structuredClone(values.get(key)),
    put: async (key, value) => { values.set(key, globalThis.structuredClone(value)); },
    delete: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key); },
    list: async ({ prefix = '', limit = Infinity } = {}) => new Map([...values].filter(([key]) => key.startsWith(prefix)).slice(0, limit).map(([key, value]) => [key, globalThis.structuredClone(value)])),
    setAlarm: async value => { storage.alarm = value; },
    transaction: async callback => {
      const before = globalThis.structuredClone(values);
      try { return await callback(storage); } catch (error) { values.clear(); for (const [key, value] of before) values.set(key, value); throw error; }
    },
  };
  return storage;
}
function setup() {
  const events = new Map(); const sms = []; const inserted = [];
  const storage = storageMock();
  const calendar = {
    busy: async () => [], // Simulate Google's freeBusy lag; the local hold must still protect the slot.
    find: async id => events.get(id) || null,
    insert: async record => {
      inserted.push(record);
      const event = { id: record.eventId, status: 'confirmed', start: { dateTime: record.start }, end: { dateTime: record.end }, extendedProperties: { private: { inddevBooking: record.requestId } } };
      events.set(record.eventId, event); return event;
    },
  };
  const dependencies = { now: () => now, calendar, sms: async record => { sms.push(record.requestId); return 'accepted'; } };
  return { manager: new BookingCalendar({ storage }, {}, dependencies), storage, calendar, events, inserted, sms, dependencies };
}
const internal = payload => new Request('https://booking.internal/book', { method: 'POST', body: JSON.stringify(payload) });

test('20 weekday slots, last start 19:30, Warsaw DST and future-only rules', () => {
  const slots = daySlots('2026-10-12', now);
  assert.equal(slots.length, 20); assert.equal(slots.at(-1).time, '19:30');
  assert.equal(slotStart('2026-10-23', '10:00'), '2026-10-23T08:00:00.000Z');
  assert.equal(slotStart('2026-10-26', '10:00'), '2026-10-26T09:00:00.000Z');
  assert.deepEqual(daySlots('2026-10-10', now), []);
  for (const [date, time] of [['2026-10-12', '20:00'], ['2026-10-12', '10:15'], ['2026-10-09', '10:00'], ['2026-02-30', '10:00'], ['2027-10-12', '10:00']]) {
    assert.throws(() => validateSlot(date, time, Date.parse('2026-10-09T08:00:00Z')));
  }
});
test('busy intervals exclude partial overlaps but allow adjacent appointments', () => {
  const slot = daySlots(data.date, now)[0];
  assert.equal(overlaps(slot, [{ start: slot.end, end: '2026-10-12T09:00:00Z' }]), false);
  assert.equal(overlaps(slot, [{ start: '2026-10-12T07:55:00Z', end: '2026-10-12T08:05:00Z' }]), true);
});
test('concurrent visitors cannot claim the same slot, even while freeBusy is stale', async () => {
  const { manager, inserted, sms } = setup();
  const results = await Promise.all([manager.fetch(internal(data)), manager.fetch(internal({ ...data, requestId: '22345678-1234-4123-8123-123456789abc' }))]);
  assert.deepEqual(results.map(result => result.status), [200, 409]); assert.equal(inserted.length, 1); assert.equal(sms.length, 1);
  const slots = await manager.slots(data.date);
  assert.equal(slots.slots.includes(data.time), false);
  assert.equal(JSON.stringify(slots).includes(data.email), false);
});
test('retry survives object restart without duplicate event or SMS and forbids changed payload', async () => {
  const { manager, storage, dependencies, inserted, sms } = setup();
  const first = await manager.fetch(internal(data));
  const restarted = new BookingCalendar({ storage }, {}, dependencies);
  assert.deepEqual(await (await restarted.fetch(internal(data))).json(), await first.json());
  assert.equal(inserted.length, 1); assert.equal(sms.length, 1);
  assert.equal((await restarted.fetch(internal({ ...data, email: 'other@example.com' }))).status, 409);
});
test('timeout after Google commits recovers by deterministic event ID and keeps slot blocked', async () => {
  const { manager, storage, dependencies, calendar, inserted, sms } = setup();
  const insert = calendar.insert;
  calendar.insert = async record => { await insert(record); throw new Error('timeout'); };
  assert.equal((await manager.fetch(internal(data))).status, 503);
  assert.equal((await manager.slots(data.date)).slots.includes(data.time), false);
  calendar.insert = insert;
  const restarted = new BookingCalendar({ storage }, {}, dependencies);
  assert.equal((await restarted.fetch(internal(data))).status, 200);
  assert.equal(inserted.length, 1); assert.equal(sms.length, 1);
});
test('alarm reconciles a lost calendar response and sends notification after confirmation', async () => {
  const { manager, calendar, storage, sms } = setup();
  const insert = calendar.insert;
  calendar.insert = async record => { await insert(record); throw new Error('timeout'); };
  await manager.fetch(internal(data)); calendar.insert = insert;
  await manager.alarm();
  assert.equal((await storage.get('booking:' + data.requestId)).state, 'confirmed'); assert.equal(sms.length, 1);
});
test('ambiguous missing event plus busy interval retains hold and cannot report false rejection', async () => {
  const { manager, calendar, storage } = setup();
  calendar.insert = async () => { throw new Error('offline'); };
  await manager.fetch(internal(data));
  calendar.busy = async () => [daySlots(data.date, now)[0]];
  assert.equal((await manager.fetch(internal(data))).status, 503);
  assert.equal((await storage.get('booking:' + data.requestId)).state, 'pending');
  assert.equal(await storage.get('hold:' + data.date + ':' + data.time), data.requestId);
});
test('known calendar rejection releases hold and does not send SMS', async () => {
  const { manager, calendar, storage, sms } = setup();
  calendar.insert = async () => { throw Object.assign(new Error('denied'), { definitive: true }); };
  assert.equal((await manager.fetch(internal(data))).status, 503);
  assert.equal(await storage.get('hold:' + data.date + ':' + data.time), undefined);
  assert.equal(sms.length, 0);
});
test('occupied calendar, weekend and out-of-hours never create events', async () => {
  const { manager, calendar, inserted } = setup();
  calendar.busy = async () => [daySlots(data.date, now)[0]];
  assert.equal((await manager.fetch(internal(data))).status, 409);
  for (const payload of [{ ...data, date: '2026-10-10' }, { ...data, time: '20:00' }]) assert.equal((await manager.fetch(internal(payload))).status, 422);
  assert.equal(inserted.length, 0);
});
test('cancellation and rescheduling in Google release the old slot', async () => {
  for (const moved of [false, true]) {
    const { manager, events } = setup();
    await manager.fetch(internal(data));
    const event = [...events.values()][0];
    if (moved) { event.start.dateTime = '2026-10-12T09:00:00Z'; event.end.dateTime = '2026-10-12T09:30:00Z'; } else event.status = 'cancelled';
    assert.equal((await manager.slots(data.date)).slots.includes(data.time), true);
  }
});
test('unknown or failed SMS does not invalidate the meeting or trigger duplicate sending', async () => {
  for (const state of ['unknown', 'failed']) {
    const { storage, dependencies, inserted } = setup(); let sends = 0;
    dependencies.sms = async () => { sends++; return state; };
    const manager = new BookingCalendar({ storage }, {}, dependencies);
    assert.equal((await manager.fetch(internal(data))).status, 200);
    const restarted = new BookingCalendar({ storage }, {}, dependencies);
    await restarted.fetch(internal(data)); await restarted.alarm();
    assert.equal(sends, 1); assert.equal(inserted.length, 1);
    assert.equal((await storage.get('booking:' + data.requestId)).smsState, state);
  }
});
test('technical booking data expires 30 days after the appointment', async () => {
  const { manager, dependencies, storage } = setup(); await manager.fetch(internal(data));
  dependencies.now = () => Date.parse('2026-11-13T12:00:00Z');
  await new BookingCalendar({ storage }, {}, dependencies).alarm();
  assert.equal((await storage.list()).size, 0);
});
const publicRequest = (body = {}, extraHeaders = {}) => new Request('https://www.inddev.pl/api/booking', { method: 'POST', headers: { Origin: 'https://www.inddev.pl', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...extraHeaders }, body: JSON.stringify({ ...data, companyUrl: '', 'cf-turnstile-response': 'test-only', ...body }) });
const configuredEnv = {
  GOOGLE_CALENDAR_ID: 'calendar@example.com', GOOGLE_CLIENT_ID: 'test-only', GOOGLE_CLIENT_SECRET: 'test-only', GOOGLE_REFRESH_TOKEN: 'test-only',
  ZADARMA_API_KEY: 'test-only', ZADARMA_API_SECRET: 'test-only', BOOKING_SMS_TO: '+48123456789',
  TURNSTILE_SECRET: 'test-only', BOOKING_LIMITER: { limit: async () => ({ success: true }) },
  BOOKINGS: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ ok: true }) }) },
};
test('public booking API requires configured integrations, origin, JSON, bounded body and booking Turnstile action', async () => {
  const verify = async () => Response.json({ success: true, hostname: 'www.inddev.pl', action: 'booking' });
  assert.equal((await bookings(publicRequest(), {}, verify)).status, 503);
  assert.equal((await bookings(publicRequest(), configuredEnv, verify)).status, 200);
  assert.equal((await bookings(publicRequest({}, { Origin: 'https://evil.example' }), configuredEnv, verify)).status, 403);
  assert.equal((await bookings(publicRequest({}, { 'Content-Type': 'text/plain' }), configuredEnv, verify)).status, 415);
  assert.equal((await bookings(publicRequest({ extra: 'x'.repeat(9000) }), configuredEnv, verify)).status, 413);
  assert.equal((await bookings(publicRequest(), configuredEnv, async () => Response.json({ success: true, hostname: 'www.inddev.pl', action: 'contact' }))).status, 422);
  assert.equal((await bookings(publicRequest(), configuredEnv, async () => { throw new Error('offline'); })).status, 503);
  assert.equal((await bookings(publicRequest({ companyUrl: 'spam' }), configuredEnv, verify)).status, 422);
  assert.equal((await bookings(publicRequest(), { ...configuredEnv, BOOKING_LIMITER: { limit: async () => ({ success: false }) } }, verify)).status, 429);
});
test('Google uses OAuth refresh, queries all configured calendars, fails closed on per-calendar errors', async () => {
  const calls = [];
  const calendar = new GoogleCalendar({ ...configuredEnv, BOOKING_BUSY_CALENDAR_IDS: 'other@example.com' }, async (url, options) => {
    calls.push({ url, options });
    if (url.includes('oauth2')) return Response.json({ access_token: 'test-only', expires_in: 3600 });
    return Response.json({ calendars: { 'calendar@example.com': { busy: [] }, 'other@example.com': { errors: [{ reason: 'notFound' }] } } });
  });
  await assert.rejects(() => calendar.busy('2026-10-12T08:00:00Z', '2026-10-12T08:30:00Z'), error => error.status === 503);
  assert.equal(calls[0].options.body.get('grant_type'), 'refresh_token');
  assert.equal(JSON.parse(calls[1].options.body).items.length, 2);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-only');
});
test('Zadarma signs RFC1738 sorted parameters and sends only a short notification to configured owner', async () => {
  const signature = zadarmaAuthorization({ number: '48123456789', message: 'Hello world~!' }, 'key', 'secret');
  assert.equal(signature.body, 'message=Hello+world%7E%21&number=48123456789');
  assert.equal(Buffer.from(signature.authorization.split(':')[1], 'base64').toString().length, 40);
  let sent;
  const state = await sendBookingSms({ ZADARMA_API_KEY: 'test-only', ZADARMA_API_SECRET: 'test-only', BOOKING_SMS_TO: '+48123456789' }, data, async (_url, options) => { sent = options; return Response.json({ status: 'success', messages: 1, denied_numbers: [] }); });
  assert.equal(state, 'accepted');
  assert.equal(new URLSearchParams(sent.body).get('number'), '48123456789');
  assert.equal(sent.body.includes(data.email), false);
  assert.equal(new URLSearchParams(sent.body).get('message').length <= 160, true);
});
test('SMS API handles provider rejection, denied recipient and ambiguous network result', async () => {
  const env = { ZADARMA_API_KEY: 'test-only', ZADARMA_API_SECRET: 'test-only', BOOKING_SMS_TO: '+48123456789' };
  assert.equal(await sendBookingSms(env, data, async () => Response.json({ status: 'error' })), 'failed');
  assert.equal(await sendBookingSms(env, data, async () => Response.json({ status: 'success', messages: 1, denied_numbers: [{ number: '48123456789' }] })), 'failed');
  assert.equal(await sendBookingSms(env, data, async () => { throw new Error('timeout'); }), 'unknown');
  assert.equal(await sendBookingSms({}, data), 'unconfigured');
});
