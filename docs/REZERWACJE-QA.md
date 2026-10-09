# Rezerwacje — kontrola i odbiór produkcyjny 9.10.2026

Status: wdrożone na produkcji. Po publikacji poprawki e110f66 potwierdzono odczyt dostępności przez Google Calendar. Szymon potwierdził sukces formularza, zapis wydarzenia w docelowym kalendarzu i doręczenie SMS po doładowaniu konta Zadarma. Rezerwacje przez stronę przeszły odbiór; agent ElevenLabs nadal wymaga osobnej integracji.

## Wyniki lokalne przed publikacją

- npm test: 35/35 zaliczonych, w tym 16 testów nowego backendu.
- Końcowy ponowny test tests/booking.test.mjs po zmianie weryfikacji Turnstile: 16/16.
- npm run build:cloudflare: 0 błędów i ostrzeżeń Astro, 10 stron, kontrola metadanych, linków i sitemap zaliczona.
- npm run check:cloudflare: dry-run zaliczony, rozpoznane BOOKINGS, EMAIL, BOOKING_LIMITER, CONTACT_LIMITER, ASSETS. Brak publikacji i utworzenia zasobów na koncie.
- Lint kodu IndDev (src, worker, scripts, tests, astro.config.mjs, eslint.config.js): zaliczony. npm run lint dla całego workspace zgłasza błędy niezależnych projektów klientów i ich wygenerowanych plików; nie zmieniano tych projektów ani konfiguracji kontroli.
- Lokalny HTTP: /umow-spotkanie 200 z CSP; /api/booking/slots bez konfiguracji sekretów 503 z jasnym komunikatem. Przycisk rezerwacji pozostaje nieaktywny.
- Rzeczywisty lokalny runtime Cloudflare SQLite Durable Object z atrapami Google/SMS: dwie równoczesne rezerwacje dają jeden sukces i jeden konflikt, ponowienie zwycięskiego requestId nie tworzy drugiej wiadomości.
- Przeglądarka Edge headless, 1440×1000 i 390×844: brak poziomego przepełnienia, brak błędów JS; wybór godziny, blokada danych po niejasnym 503, ponowienie z tym samym requestId i potwierdzenie zaliczone na atrapach usług.
- Obejrzano obrazy docelowe output/rezerwacje/desktop.png i mobile.png. Dostępne godziny na tych obrazach są danymi testowymi, nie rzeczywistą dostępnością kalendarza.

## Ograniczenia

Wrangler zgłaszał problem certyfikatu podczas pobierania opcjonalnego Request.cf. Lokalny serwer i test SQLite działały; nie wyłączano kontroli TLS. W kontroli lokalnej nie używano prawdziwych kont dostawców; odbiór produkcyjny opisano poniżej.

Równoczesne rezerwacje i awarie dostawców sprawdzono lokalnie z atrapami, a nie na produkcji. Konfiguracja i procedura odbioru: REZERWACJE.md.

ElevenLabs i numer recepcjonistki nie zostały zmienione. Agent wymaga osobnej integracji, aby korzystać z tych samych blokad.

Zachowano wcześniejszą zmianę użytkownika w src/styles/global.css.

## Pierwszy odbiór produkcyjny i korekta

- Commit 11ac800 wysłano do GitHub master po zatwierdzeniu przez Szymona. Ręczny build w panelu Cloudflare udostępnił /umow-spotkanie (HTTP 200).
- Dostępność niedzieli: HTTP 200 i pusta lista; nieprawidłowa data: HTTP 422. Dzień roboczy zwracał ogólny HTTP 503.
- Błąd odtworzono w rzeczywistym lokalnym runtime Cloudflare: wywołanie natywnego fetch jako metody klienta Google gubiło poprawny odbiornik i zgłaszało Illegal invocation. Testy z atrapami tego nie wykryły.
- Korekta wiąże transport z globalThis. Natywny transport GoogleCalendar w lokalnym workerd pobiera teraz odpowiedź HTTP 200 z lokalnego serwera testowego.
- Po korekcie: npm test 36/36, lint kodu IndDev zaliczony. Wynik późniejszego odbioru rzeczywistego wydarzenia i SMS opisano poniżej.

## Końcowy odbiór produkcyjny

- Publiczne odczyty po wdrożeniu poprawki: /umow-spotkanie HTTP 200; 12.10.2026 HTTP 200 z godzinami co 30 minut, Europe/Warsaw; niedziela HTTP 200 z pustą listą.
- Szymon potwierdził potwierdzenie rezerwacji na stronie oraz wydarzenie w Google Calendar. Po pierwszym teście godzina 12:30 dnia 12.10.2026 przestała być dostępna w publicznym API.
- Pierwszy SMS nie dotarł, a właściciel potwierdził puste saldo Zadarma. Nie odczytano odpowiedzi API dostawcy, więc nie ustalono technicznego kodu odmowy.
- Po doładowaniu konta i ponownym teście Szymon potwierdził odbiór SMS oraz poprawne działanie całości. Dowód doręczenia jest potwierdzeniem właściciela, nie jedynie przyjęciem żądania przez API.
- Nie włączano automatycznych ponowień SMS ani nie tworzono zastępczych spotkań przez backend. Testowe wydarzenia usuwa właściciel w kalendarzu.
- Publikację wykonał Szymon ręcznym buildem w panelu Cloudflare, po wysłaniu zatwierdzonych zmian do GitHub master. Lokalny Wrangler nie był używany do publikacji.
