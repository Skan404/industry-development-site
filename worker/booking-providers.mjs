import { createHash, createHmac } from 'node:crypto';
import { bookingError, TIME_ZONE } from './booking-time.mjs';

export const eventIdFor = requestId => createHash('sha256').update(requestId).digest('hex');
export function calendarConfigured(env) {
  return ['GOOGLE_CALENDAR_ID', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'].every(key => Boolean(env[key]));
}
export function smsConfigured(env) {
  return Boolean(env.ZADARMA_API_KEY && env.ZADARMA_API_SECRET && /^\+?[1-9]\d{7,14}$/.test(env.BOOKING_SMS_TO || ''));
}
export class GoogleCalendar {
  constructor(env, providerFetch = fetch) { this.env = env; this.fetch = providerFetch.bind(globalThis); this.token = null; this.expires = 0; }
  async accessToken() {
    if (this.token && this.expires > Date.now()) return this.token;
    const response = await this.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID, client_secret: this.env.GOOGLE_CLIENT_SECRET,
        refresh_token: this.env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token',
      }), signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (!response.ok || typeof data.access_token !== 'string') throw bookingError(503, 'Kalendarz jest chwilowo niedostępny. Spróbuj później.');
    this.token = data.access_token; this.expires = Date.now() + (Number(data.expires_in) - 60) * 1000;
    return this.token;
  }
  async request(path, options = {}) {
    const token = await this.accessToken();
    const response = await this.fetch('https://www.googleapis.com/calendar/v3/' + path, {
      ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) { this.token = null; this.expires = 0; }
    return response;
  }
  eventPath(id = '') {
    return 'calendars/' + encodeURIComponent(this.env.GOOGLE_CALENDAR_ID) + '/events' + (id ? '/' + id : '');
  }
  async busy(start, end) {
    const ids = [...new Set([this.env.GOOGLE_CALENDAR_ID, ...(this.env.BOOKING_BUSY_CALENDAR_IDS || '').split(',').map(id => id.trim()).filter(Boolean)])];
    const response = await this.request('freeBusy', { method: 'POST', body: JSON.stringify({
      timeMin: start, timeMax: end, timeZone: TIME_ZONE, items: ids.map(id => ({ id })),
    }) });
    const data = await response.json();
    if (!response.ok || ids.some(id => !data.calendars?.[id] || data.calendars[id].errors?.length || !Array.isArray(data.calendars[id].busy))) throw bookingError(503, 'Nie możemy teraz sprawdzić wolnych terminów. Spróbuj później.');
    const busy = ids.flatMap(id => data.calendars[id].busy);
    if (busy.some(item => !Number.isFinite(Date.parse(item.start)) || !Number.isFinite(Date.parse(item.end)) || Date.parse(item.end) <= Date.parse(item.start))) throw bookingError(503, 'Nie możemy teraz sprawdzić wolnych terminów.');
    return busy;
  }
  async find(id) {
    const response = await this.request(this.eventPath(id));
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) throw bookingError(503, 'Nie możemy teraz potwierdzić rezerwacji. Ponów próbę dla tego samego terminu.');
    return response.json();
  }
  async insert(record) {
    const response = await this.request(this.eventPath() + '?sendUpdates=none', { method: 'POST', body: JSON.stringify({
      id: record.eventId, summary: 'IndDev — rozmowa: ' + record.name,
      description: 'Firma: ' + record.company + '\nE-mail: ' + record.email + '\nTelefon: ' + (record.phone || 'Nie podano') + '\nRezerwacja: ' + record.requestId,
      start: { dateTime: record.start, timeZone: TIME_ZONE }, end: { dateTime: record.end, timeZone: TIME_ZONE },
      transparency: 'opaque', extendedProperties: { private: { inddevBooking: record.requestId } },
    }) });
    if (response.status === 409) return this.find(record.eventId);
    if (!response.ok) {
      // 5xx/transport errors may occur after Google committed the event. Keep the hold.
      const definitive = [400, 401, 403, 404, 422, 429].includes(response.status);
      throw Object.assign(bookingError(503, 'Nie udało się potwierdzić rezerwacji. Ponów próbę dla tego samego terminu.'), { definitive });
    }
    return response.json();
  }
}

export function zadarmaAuthorization(params, key, secret) {
  // PHP_QUERY_RFC1738: encode spaces as +, and ~ as %7E.
  const encode = value => encodeURIComponent(value).replace(/[!'()*~]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, '+');
  const body = Object.keys(params).sort().map(name => encode(name) + '=' + encode(params[name])).join('&');
  const hex = createHmac('sha1', secret).update('/v1/sms/send/' + body + createHash('md5').update(body).digest('hex')).digest('hex');
  return { body, authorization: key + ':' + Buffer.from(hex).toString('base64') };
}
export async function sendBookingSms(env, record, providerFetch = fetch) {
  if (!smsConfigured(env)) return 'unconfigured';
  // No visitor data in SMS; one short ASCII message avoids multi-part Unicode charges.
  const params = { number: env.BOOKING_SMS_TO.replace(/^\+/, ''), message: 'IndDev: nowa rezerwacja ' + record.date + ' o ' + record.time + ' (30 min). Szczegoly w Google Calendar.' };
  if (env.ZADARMA_SMS_SENDER) params.sender = env.ZADARMA_SMS_SENDER;
  const { body, authorization } = zadarmaAuthorization(params, env.ZADARMA_API_KEY, env.ZADARMA_API_SECRET);
  try {
    const response = await providerFetch('https://api.zadarma.com/v1/sms/send/', {
      method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (response.ok && data.status === 'success' && Number(data.messages) > 0 && !data.denied_numbers?.length) return 'accepted';
    if (data.status === 'error' || data.denied_numbers?.length) return 'failed';
    return 'unknown';
  } catch { return 'unknown'; }
}
