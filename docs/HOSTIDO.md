# IndDev — paczka przedwdrożeniowa dla Hostido + Cloudflare

Ta paczka jest przygotowana lokalnie. Nie została opublikowana i nie zawiera haseł ani config.php. Publiczny formularz pozostaje wyłączony, dopóki nie zostaną skonfigurowane serwer i klucze. Domena docelowa: https://www.inddev.pl.

## Struktura na Hostido

```text
katalog-domeny/
  public_html/           ← tylko pliki z public_html tej paczki
    .htaccess
    api/contact.php
    _astro/.htaccess
  inddev-private/        ← poza public_html, obok niego
    config.example.php
    config.php           ← tworzony dopiero na serwerze
    src/
    vendor/
    check.php
    prune.php
    storage/
```

Nie wgrywaj całego repozytorium, pliku .env, node_modules ani inddev-private do public_html. Jeśli struktura domeny jest inna, zmień wyłącznie ścieżkę `$private` w api/contact.php. Domyślna ścieżka jest liczona dwa poziomy w górę od public_html/api.

## Wymagania serwera

- PHP 8.2 lub nowsze z curl, mbstring, openssl oraz działającą weryfikacją certyfikatów CA.
- LiteSpeed/Apache z obsługą .htaccess, mod_rewrite i mod_headers; potwierdzić w wybranym planie.
- Dostęp do SMTP Hostido przez TLS: port 465 (smtps) lub 587 (starttls).
- Połączenia HTTPS do challenges.cloudflare.com.
- Zapisywalny, prywatny storage; konfiguracja 0600, prywatny katalog 0700 o ile zgodne z użytkownikiem PHP na hostingu.
- Cron co godzinę uruchamiający `php /pełna/ścieżka/inddev-private/prune.php`.

## Zanim włączysz formularz

1. Potwierdź formalnego usługodawcę i administratora danych. Flagi w config/site.json muszą odpowiadać rzeczywistemu potwierdzeniu właściciela, nie ustawiaj ich tylko po to, by ominąć kontrolę.
2. Utwórz docelową skrzynkę kontakt@inddev.pl w Hostido. Użytkownik potwierdził ten planowany adres; jego istnienie i odbiór wiadomości trzeba sprawdzić podczas wdrożenia.
3. Utwórz prawdziwą skrzynkę nadawczą w Hostido. Skopiuj config.example.php do config.php i wpisz host SMTP, port, login, hasło, from oraz recipient. Hasło nie może trafić do Git.
4. Ustaw produkcyjny sekret Turnstile, hostname www.inddev.pl, action contact. Backend sprawdza wszystkie trzy warunki: success, hostname i action. Nie używaj kluczy testowych w produkcji.
5. Wygeneruj rate_secret: `php -r "echo bin2hex(random_bytes(32));"`. Ustaw enabled=true dopiero po konfiguracji.
6. `php inddev-private/check.php` sprawdza kompletność bez wysyłania wiadomości i bez wypisywania sekretów.
7. Sprawdź sposób ustalania IP w Hostido. Backend domyślnie używa REMOTE_ADDR. Jeśli LiteSpeed przywraca IP klienta, pozostaw trusted_proxy_cidrs puste. Jeśli nie, dodaj aktualne, zweryfikowane zakresy Cloudflare z https://www.cloudflare.com/ips/; dopiero dla tych adresów backend ufa CF-Connecting-IP. Nie ufaj dowolnemu X-Forwarded-For ani nagłówkom od bezpośrednich klientów.
8. W lokalnym .env wpisz prawdziwy publiczny klucz Turnstile, PUBLIC_FORM_ENABLED=true, endpoint /api/contact.php i prawdziwy adres kontaktowy. Publiczny klucz nie jest sekretem. Ponownie zbuduj paczkę.
9. Uruchom `npm run check:production` dla nowego buildu. Kontrola nie zastępuje testu hostingu, SMTP ani dokumentów prawnych.

## Wdrożenie — późniejszy etap, nie wykonano

- Wgraj pliki z zachowaniem .htaccess, także w _astro. Zainstaluj certyfikat HTTPS dla www i domeny bez www na Hostido.
- Cloudflare: DNS strony wskazuje Hostido, proxy dla WWW, SSL Full (strict). Backend musi otrzymywać HTTPS; nie używaj Flexible.
- Poczta: właściwe MX/SPF/DKIM/DMARC; hosty SMTP/IMAP jako DNS only. Nie włączaj Cloudflare Email Routing zamiast skrzynki Hostido.
- Jeśli aktywne było DNSSEC u poprzedniego dostawcy DNS, skoordynuj rekord DS przed zmianą delegacji. DNSSEC Cloudflare włącz po sprawdzeniu nowej strefy.
- Nie uruchamiaj cache-all dla /api/*; odpowiedzi formularza mają no-store. Hashowane pliki _astro mogą mieć długi cache, HTML wymaga rewalidacji. Po zmianie strony czyść odpowiedni cache.
- Nie włączaj automatycznych transformacji skryptów/HTML, które zmieniają inline scripts: CSP w .htaccess ma hashe dokładnie tego buildu. Zmienione HTML wymaga ponownego wygenerowania paczki.
- .htaccess normalizuje HTTPS/www, stare adresy, index.html i końcowe ukośniki. DirectorySlash Off zapobiega pętli z bezukośnikowymi adresami Astro. Sprawdź te reguły na rzeczywistym LiteSpeed; lokalny PHP nie interpretuje .htaccess.
- 404 musi zwracać status 404, nie 200. Ścieżka /api/contact.php nie może zostać obsłużona jako plik tekstowy.
- Ustaw ochronę wersji testowej przed dostępem publicznym. Usuń ją dopiero przy świadomym uruchomieniu.

## Zachowanie formularza

- POST JSON do tej samej domeny; limit 8 KB, ścisły Origin, długości pól i ochrona nagłówków e-mail.
- 5 prób / IP / 15 minut i globalnie 100 / 15 minut. Limity celowo obejmują nieudane próby Turnstile.
- Jednorazowy identyfikator zgłoszenia ogranicza podwójne wysyłki. Ponowienie po potwierdzonym SMTP nie wysyła kolejnego maila. Po niejednoznacznym błędzie SMTP backend blokuje powtórkę tego ID przez 24 h i prosi o kontakt e-mail.
- Minimalny backend serializuje wysyłki przez krótki lock pliku; równoległy użytkownik może dostać 429 zamiast dublowania pracy. Dla tej małej strony jest to celowy kompromis, nie system masowych zgłoszeń.
- Dane klienta znajdują się w skrzynce, nie w bazie WWW. Prywatny state.json zawiera pseudonimowe HMAC, czasy i statusy, bez surowych kontaktów, IP i tokenów.
- Cron usuwa wygasłe wpisy co godzinę. Bez cron fizyczne usunięcie następuje dopiero przy kolejnym zgłoszeniu — dlatego cron jest częścią wdrożenia.
- Sukces oznacza przyjęcie przez SMTP, nie gwarancję dostarczenia do folderu Odebrane. Nie ma automatycznej wiadomości do adresu wpisanego przez użytkownika.

## Dokumenty i retencja

Treść dokumentów przygotowano dla strony ofertowej B2B bez płatności i kont. Regulamin nie jest umową na projekt strony. Szczegóły wcześniejszego zakończenia 24-miesięcznej umowy i przeniesienia praw pozostają do określenia w indywidualnej umowie.

Potwierdzić: tożsamość administratora, prawo do działania w imieniu firmy, skrzynkę, umowy powierzenia Hostido/Cloudflare, podstawy transferów i rzeczywiste ustawienia usług. Polityka ustala 12 miesięcy od ostatniego kontaktu dla niezakończonych umową zapytań; wymaga to okresowego usuwania korespondencji przez administratora. Sprawdzić okresy logów i kopii u dostawców, nie deklarować automatycznej retencji, której hosting nie zapewnia.

Brak opcjonalnej analityki i marketingu. Po włączeniu Cloudflare/Turnstile przeprowadzić test cookies, pamięci i połączeń. W tej paczce nie ma banera zgód. Ocenić niezbędność faktycznie aktywnych mechanizmów bezpieczeństwa; przy dodaniu narzędzi wymagających zgody trzeba najpierw wdrożyć właściwy mechanizm wyboru. Nie włączać nowych integracji bez aktualizacji dokumentów.

## Odbiór na serwerze

- Wszystkie strony, CSS, JS, fonty i obraz OG dostępne po HTTPS.
- Przekierowania http, bez www, /uslugi/, /uslugi/index.html, /oferta i /o-studiu bez pętli.
- Losowy nieistniejący adres daje 404; prywatne pliki nie są dostępne.
- Formularz z prawidłowym Turnstile dochodzi do skrzynki. Nieprawidłowy token, obcy Origin i limit dają błąd.
- Test SPF/DKIM/DMARC oraz odbioru i odpowiedzi pocztą.
- Formularz zachowuje dane przy błędzie; brak JavaScript/WebGL i ograniczony ruch nie blokują informacji ani e-maila.
- Sprawdzenie CSP w konsoli, trybu mobilnego, faktycznych cookies i odnowienia certyfikatu.
- Puste realizacje: noindex i brak w sitemap. Główna/usługi/kontakt: indeksowalne.

## Aktualizacje i cofnięcie

Buduj lokalnie, zapisuj wersję paczki i sumy SHA256. Przed podmianą wykonaj kopię public_html. Najpierw wgraj nowe hashowane zasoby, następnie HTML i .htaccess z tego samego buildu. Nie nadpisuj config.php ani storage. Przy błędzie przywróć spójną poprzednią paczkę i wyczyść cache Cloudflare. Bezpieczniejsze przełączenie całego katalogu wymaga potwierdzenia możliwości hostingu.
