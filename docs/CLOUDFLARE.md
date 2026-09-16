# Wdrożenie IndDev na Cloudflare Workers

Aktualny wariant: domena w Hostido; statyczna strona Astro i jeden endpoint /api/contact na Cloudflare. Brak PHP, SMTP, bazy danych, cron i dodatkowego dostawcy wysyłki. Poprzedni backend server/ i instrukcja HOSTIDO.md są archiwalnym wariantem — nie są publikowane.

## Co już ustawiono ręcznie

- inddev.pl jest aktywna w Cloudflare.
- Email Routing przekazuje kontakt@inddev.pl na zweryfikowany szymon.kaniewski.work@gmail.com; użytkownik potwierdził odbiór testu.
- Turnstile ma domenę inddev.pl, tryb Managed, bez pre-clearance. Publiczny Site Key zapisano w skrypcie budowania. Secret Key pozostaje wyłącznie u właściciela.

## Lokalna kontrola

Node.js 22.12+; npm ci, npm test, npm run lint, npm run build:cloudflare, npm run check:cloudflare.
Ostatnia komenda to wyłącznie dry-run, bez publikacji. npm run preview:cloudflare uruchamia lokalny runtime z plikami dist. Lokalna wysyłka nie potwierdza dostarczenia prawdziwej poczty.

## Publikacja przez panel — kolejne kroki z właścicielem

1. Utwórz projekt Workers pod nazwą inddev i połącz istniejące repozytorium GitHub (root projektu, branch master).
2. Build command: npm run build:cloudflare. Deploy command: npx wrangler deploy. Nie wybieraj samego uploadu statycznych plików — potrzebny jest również endpoint Workera.
3. W Settings → Variables and Secrets dodaj TURNSTILE_SECRET jako Secret, z wartością z widgetu. Nie wpisuj go do Git, publicznych zmiennych buildu ani czatu. Brak sekretu daje bezpieczny błąd 503, nie fałszywy sukces.
4. Konfiguracja wrangler.jsonc deklaruje EMAIL ograniczone do jednego zweryfikowanego odbiorcy oraz CONTACT_LIMITER. Nie włączaj płatnego planu ani wysyłki do dowolnych adresów. Bezpłatna wysyłka dotyczy zweryfikowanego odbiorcy; rzeczywiste działanie potwierdzimy testem po publikacji.
5. Dodaj Custom Domains www.inddev.pl oraz inddev.pl do Workera. Konfiguracja celowo nie publikuje workers.dev ani preview URLs. Rekordów MX/TXT poczty nie usuwaj. Włącz Always Use HTTPS dla domeny w panelu. W Rules → Redirect Rules dodaj jedną regułę 301 dla hostname inddev.pl: cel dynamiczny concat("https://www.inddev.pl", http.request.uri.path), z zachowaniem query string. Workers _redirects obsługuje ścieżki, nie warunek domeny; dlatego przekierowanie www ustawiamy w panelu.
6. Zbuduj i opublikuj. Test: domena bez www przekierowuje na www, /uslugi/ normalizuje się do /uslugi, brakująca strona daje 404, formularz trafia do Gmaila, Reply-To wskazuje klienta, błędny token nie wysyła wiadomości.

Możliwe jest też ręczne wdrożenie przez npm run deploy:cloudflare po zalogowaniu Wrangler, ale nie uruchomiono tego w ramach przygotowania kodu.

## Prosta ochrona i jej granice

Walidacja po stronie serwera, tylko POST JSON, limit 8 KB także bez Content-Length, kontrola Origin, honeypot, serwerowa weryfikacja Turnstile (hostname i action), 5 prób na minutę na IP w lokalizacji Cloudflare. Limit Cloudflare jest przybliżony i lokalny, nie jest globalną gwarancją. Wspólne IP może oznaczać wspólny limit.

Turnstile odrzuca ponowne użycie tego samego tokenu; frontend blokuje równoczesne wysłanie. Nie ma trwałej bazy potwierdzeń/idempotencji. Po utracie odpowiedzi nie można zagwarantować braku duplikatu przy ponownym wysłaniu z nowym tokenem. Backend nie ponawia wysyłki automatycznie. Sukces oznacza przyjęcie do wysyłki, nie gwarancję folderu Odebrane.

Sekrety nie trafiają do dist. Gmail odbiorcy znajduje się tylko w konfiguracji i kodzie backendu, nie w HTML strony. Cloudflare zarządza licznikami. Nie logujemy treści formularza i nie włączamy Workers Observability.

## Aktualizacje

Każda zmiana: testy, build:cloudflare i dry-run, potem zatwierdzony push/deploy. Build generuje _headers z CSP dopasowanym do skryptów inline oraz _redirects. Nie włączaj transformacji modyfikujących skrypty inline. Strona statyczna omija wykonanie Workera; tylko /api/* uruchamia backend. Inne brakujące ścieżki obsługuje warstwa zasobów.

Poczta Gmail odbiera zgłoszenia; Email Routing nie daje możliwości odpowiadania jako kontakt@inddev.pl. Retencję korespondencji realizuje właściciel w skrzynce. Zaktualizowano dostawców w polityce prywatności. Warunki korzystania z konta Gmail przez firmę i upoważnienia do skrzynki pozostają kwestią organizacyjną administratora.

Źródła sprawdzone przy implementacji:
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/configuration/send-bindings/
- https://developers.cloudflare.com/email-service/platform/pricing/
