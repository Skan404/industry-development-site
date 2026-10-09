export const TIME_ZONE = 'Europe/Warsaw';
export const SLOT_MS = 30 * 60 * 1000;
export const HORIZON_DAYS = 60;
export const bookingError = (status, message) => Object.assign(new Error(message), { status });

export function localDate(value = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}
export function validateDate(date, now = Date.now()) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bookingError(422, 'Wybierz poprawną datę.');
  const day = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw bookingError(422, 'Wybierz poprawną datę.');
  if (date < localDate(now) || date > localDate(now + HORIZON_DAYS * 86400000)) throw bookingError(422, 'Wybierz datę w ciągu najbliższych 60 dni.');
  return day.getUTCDay() !== 0 && day.getUTCDay() !== 6;
}
export function slotStart(date, time) {
  const probe = new Date(date + 'T12:00:00Z');
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' }).formatToParts(probe).find(part => part.type === 'timeZoneName').value;
  const offset = Number(zone.replace('GMT', ''));
  return new Date(Date.parse(date + 'T' + time + ':00Z') - offset * 3600000).toISOString();
}
export function daySlots(date, now = Date.now()) {
  if (!validateDate(date, now)) return [];
  return Array.from({ length: 20 }, (_, index) => {
    const time = String(10 + Math.floor(index / 2)).padStart(2, '0') + ':' + (index % 2 ? '30' : '00');
    const start = slotStart(date, time);
    return { time, start, end: new Date(Date.parse(start) + SLOT_MS).toISOString() };
  }).filter(slot => Date.parse(slot.start) > now);
}
export function validateSlot(date, time, now = Date.now()) {
  const slot = daySlots(date, now).find(item => item.time === time);
  if (!slot) throw bookingError(422, 'Wybierz przyszły termin od poniedziałku do piątku, 10:00–19:30.');
  return slot;
}
export function overlaps(slot, busy) {
  return busy.some(period => Date.parse(period.start) < Date.parse(slot.end) && Date.parse(period.end) > Date.parse(slot.start));
}
