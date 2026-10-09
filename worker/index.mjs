import { contact } from './contact.mjs';
import { bookings, bookingJson } from './booking.mjs';
export { contact, validate } from './contact.mjs';
export { BookingCalendar } from './booking.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return contact(request, env);
    if (url.pathname === '/api/booking/slots' || url.pathname === '/api/booking') return bookings(request, env);
    if (url.pathname.startsWith('/api/')) return bookingJson({ ok: false, message: 'Nie znaleziono endpointu.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
