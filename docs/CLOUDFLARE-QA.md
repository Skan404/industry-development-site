# Kontrola migracji Cloudflare — 16.09.2026

- npm test: 19 testów zaliczonych (7 nowych dla Workera).
- npm run lint: bez błędów.
- npm run build:cloudflare: 32 pliki sprawdzone przez Astro, zero błędów/ostrzeżeń, 9 stron; metadane, linki i konfiguracja formularza przechodzą kontrolę produkcyjnego buildu.
- Wrangler 4.132.0 dry-run: poprawny bundle, rozpoznane ASSETS, EMAIL oraz CONTACT_LIMITER. Nie wykonano deploy.
- Lokalny runtime Wrangler: / i /uslugi zwracają 200; /uslugi/ przekierowuje 307 na /uslugi; /oferta przekierowuje 301 na /uslugi; nieistniejąca strona zwraca 404. Strony mają CSP i reguły cache.
- API: GET /api/contact zwraca 405, nieznany /api/* zwraca JSON 404, POST bez sekretu zwraca bezpieczne 503, odpowiedzi API mają no-store.
- Testy obejmują odrzucenie obcego Origin, błędnego typu/rozmiaru danych, honeypotu i wstrzyknięcia nagłówków; błędny hostname/action/token Turnstile; limit prób; awarię wysyłki; stałego odbiorcę i Reply-To klienta. Testy nie wysyłają prawdziwych wiadomości.
- npm install: audyt 428 pakietów, zero zgłoszonych podatności.

Pozostaje ręczna konfiguracja TURNSTILE_SECRET i Custom Domains, przekierowania apex na www oraz HTTPS. Faktyczny test Turnstile i dostarczenia maila trzeba wykonać po publikacji. Nie wpisano sekretów, nie zalogowano Wrangler do konta i nie zmieniano ustawień Cloudflare.

Uproszczenie: nie używamy bazy ani trwałej deduplikacji. Jednorazowy token Turnstile oraz blokada równoległego submitu ograniczają duplikaty, ale nie gwarantują dokładnie jednej wiadomości przy ponowieniu z nowym tokenem po błędzie sieci. Limit prób działa na IP w danej lokalizacji Cloudflare.
