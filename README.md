# Industry Development / IndDev

Strona Astro dla https://www.inddev.pl. Główna, Usługi, Realizacje, Kontakt, Polityka prywatności i Regulamin. Hosting docelowy: Hostido + Cloudflare. Na tym etapie brak publikacji i konfiguracji kont.

## Lokalnie

Node.js 22.12+; npm ci, następnie npm run dev. Podgląd: http://127.0.0.1:4321.

```sh
npm run lint
npm test
npm run test:php
npm run build
npm run check:release
npm run package:hostido
```

Backend wymaga PHP 8.2+ z curl, mbstring i openssl oraz PHPMailer. Zainstaluj zależności przez `composer install --working-dir=server --no-dev --prefer-dist`. Przypięta wersja jest w server/composer.lock. Jeśli PHP nie jest w PATH, ustaw PHP_BINARY. Narzędzie testowe rozpoznaje też lokalny przenośny runtime .tools/php/php.exe (nie jest częścią repozytorium ani paczki).

Testy backendu używają atrap weryfikacji i transportu: nie wysyłają maili i nie łączą się z Cloudflare. Test faktycznej wysyłki jest oddzielnym krokiem wdrożenia.

## Konfiguracja

- config/site.json: domena, marka, publiczny kontakt i dane podmiotu. Flagi potwierdzenia danych nie są zgodą prawną — zapisują faktyczne potwierdzenie użytkownika.
- .env.example: wyłącznie publiczne opcje buildu. Formularz domyślnie wyłączony do czasu konfiguracji serwera.
- server/config.example.php: prywatny wzorzec SMTP, Turnstile, limitów i odbiorcy; config.php nigdy nie trafia do Git ani katalogu publicznego.
- src/data/site.ts: wspólna oferta, ceny, czasy odpowiedzi.
- src/data/projects.ts: rzeczywiste realizacje. Pusta tablica automatycznie wyłącza indeksowanie strony i usuwa ją z sitemap.

## Paczka

`npm run package:hostido` tworzy release/hostido z public_html i osobnym inddev-private. Paczka ma sumy SHA256 i status kandydata przedwdrożeniowego. Nie zawiera kluczy, config.php ani testowych konfiguracji. `npm run check:production` celowo blokuje gotowość produkcyjną bez potwierdzonych danych i prawdziwego klucza Turnstile oraz aktywnego formularza w wygenerowanym HTML.

Instrukcja: docs/HOSTIDO.md. Odbiór lokalny: docs/PREDEPLOY-QA.md. Ustalenia dokumentów i odnośniki prawne: docs/LEGAL-REVIEW.md.

## Architektura i materiały

Statyczny frontend, lokalne fonty, WebGL/Canvas z zastępstwami, efekty wyłączane poza ekranem. Pojedynczy endpoint PHP + SMTP Hostido + Turnstile. Brak Google Analytics, pikseli i localStorage analitycznego.

Grafika OG: public/og/inddev.png (1200×630), generowana przez `npm run og`. Zachowano powiadomienie o licencji adaptacji React Bits w public/react-bits-license.txt i src/vendor/react-bits. PHPMailer ma własną licencję w prywatnej paczce vendor. Podstrona prywatności opisuje planowaną konfigurację produkcyjną; przed publikacją konieczna jest zgodność z faktycznie włączonymi usługami.

Katalogi Indevtest oraz love-lashes to niezależne projekty, wyłączone z buildu i paczki.
