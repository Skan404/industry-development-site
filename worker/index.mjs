const ORIGIN = 'https://www.inddev.pl';
const RECIPIENT = 'szymon.kaniewski.work@gmail.com';
const failure = (status, message) => Object.assign(new Error(message), { status });
const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});

export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure(400, 'Nieprawidłowe zgłoszenie.');
  const clean = {};
  for (const [key, max] of Object.entries({ name: 100, company: 160, email: 254, phone: 40 })) {
    const value = data[key] ?? '';
    if (typeof value !== 'string' || [...value].length > max || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw failure(422, 'Sprawdź dane w formularzu.');
    clean[key] = value.trim();
    if (key !== 'phone' && !clean[key]) throw failure(422, 'Uzupełnij imię i nazwisko, firmę i e-mail.');
  }
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(clean.email)) throw failure(422, 'Podaj poprawny adres e-mail.');
  if (clean.phone && !/^\+?[0-9 ()\-.]{6,40}$/.test(clean.phone)) throw failure(422, 'Podaj poprawny telefon.');
  if ((data.companyUrl ?? '') !== '') throw failure(422, 'Nie udało się zweryfikować zgłoszenia.');
  if (typeof data.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.requestId)) throw failure(400, 'Odśwież stronę i spróbuj ponownie.');
  const token = data['cf-turnstile-response'];
  if (typeof token !== 'string' || !token || token.length > 2048) throw failure(422, 'Dokończ weryfikację antyspamową.');
  return { ...clean, requestId: data.requestId, token };
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 8192) throw failure(413, 'Zgłoszenie jest zbyt duże.');
  const reader = request.body?.getReader();
  if (!reader) throw failure(400, 'Brak danych zgłoszenia.');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8192) { await reader.cancel(); throw failure(413, 'Zgłoszenie jest zbyt duże.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { throw failure(400, 'Nieprawidłowe zgłoszenie.'); }
}

export async function contact(request, env, verifyFetch = fetch) {
  try {
    if (request.method !== 'POST') return json({ ok: false, message: 'Dozwolona jest metoda POST.' }, 405);
    if (request.headers.get('origin') !== ORIGIN) throw failure(403, 'Wyślij formularz bezpośrednio ze strony IndDev.');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw failure(415, 'Nieobsługiwany format.');
    if (!env.TURNSTILE_SECRET || !env.EMAIL?.send || !env.CONTACT_LIMITER?.limit) throw failure(503, 'Formularz jest chwilowo niedostępny. Napisz e-mail.');
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) throw failure(400, 'Nieprawidłowe żądanie.');
    const { success } = await env.CONTACT_LIMITER.limit({ key: ip });
    if (!success) throw failure(429, 'Zbyt wiele prób. Poczekaj minutę lub napisz e-mail.');
    const data = validate(await readBody(request));
    let verification;
    try {
      const response = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: data.token }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Verification unavailable');
      verification = await response.json();
    } catch { throw failure(503, 'Weryfikacja antyspamowa jest chwilowo niedostępna. Spróbuj później.'); }
    if (verification?.success !== true || verification.hostname !== 'www.inddev.pl' || verification.action !== 'contact') throw failure(422, 'Weryfikacja wygasła lub nie powiodła się. Spróbuj ponownie.');
    try {
      await env.EMAIL.send({
        from: 'kontakt@inddev.pl', to: RECIPIENT, replyTo: data.email,
        subject: 'IndDev — nowe zapytanie ze strony',
        text: `Imię i nazwisko: ${data.name}\nFirma: ${data.company}\nE-mail: ${data.email}\nTelefon: ${data.phone || 'Nie podano'}\n\nIdentyfikator: ${data.requestId}`,
      });
    } catch { throw failure(502, 'Nie udało się potwierdzić wysyłki. Napisz bezpośrednio na kontakt@inddev.pl.'); }
    return json({ ok: true, requestId: data.requestId });
  } catch (error) {
    return json({ ok: false, message: error.status ? error.message : 'Formularz jest chwilowo niedostępny. Napisz e-mail.' }, error.status || 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return contact(request, env);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, message: 'Nie znaleziono endpointu.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
