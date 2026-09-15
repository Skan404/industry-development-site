# Industry Development

Nowy serwis studia w Astro: **Główna / Usługi / Realizacje / Kontakt**. Grafitowa baza, miętowy akcent, lokalne fonty Inter i Space Grotesk. Efekty są adaptacjami i interpretacjami referencji React Bits, bez dodawania React do projektu.

## Uruchomienie

W głównym katalogu `InDev`, Node.js 22.12 lub nowszy:

```sh
npm install
npm run dev
```

Podgląd: `http://127.0.0.1:4321`. Katalogi `Indevtest` i `love-lashes` to osobne projekty; nie są częścią tego buildu ani kontroli typów.

```sh
npm run lint
npm run test
npm run build
npm run preview
```

Wynik produkcyjny znajduje się w `dist`. Nie wymaga działającego serwera Node.js. Adresy `/oferta` i `/o-studiu` przekierowują do odpowiednich miejsc nowej strony. `/realizacje` to osobna podstrona z pustym portfolio.

## Najważniejsze pliki

- `src/pages/index.astro` — kompozycja strony głównej.
- `src/pages/uslugi.astro` — zakres usług i pełne pakiety.
- `src/pages/kontakt.astro`, `src/components/ContactForm.astro` — kontakt, walidacja i obsługa wysyłki.
- `src/styles/global.css` — pełny system wizualny i wersja mobilna.
- `src/scripts/navigation.ts` — pływająca nawigacja i menu.
- `src/scripts/effects.ts` — animacje, statyczne zastępstwa i zarządzanie ich pracą.
- `src/data/site.ts` — ceny, zakresy, pytania i dane firmy.
- `docs/ANIMATIONS.md` — sprawdzone źródła, API, licencja i różnice względem referencji.
- `docs/QA.md` — wykonane kontrole i ich ograniczenia.

## Podłączenie kontaktu przed publikacją

Skopiuj `.env.example` do `.env` i uzupełnij:

```dotenv
SITE_URL=https://twoja-domena.pl
PUBLIC_CONTACT_ENDPOINT=https://twoja-domena.pl/api/contact
PUBLIC_CONTACT_EMAIL=
PUBLIC_CONTACT_PHONE=
PUBLIC_TURNSTILE_SITE_KEY=
```

Brak endpointu jest obsłużony jawnie: formularz nie wysyła żądań, zachowuje treść i pozwala pobrać lokalną kopię zapytania. Nie ma fałszywego komunikatu powodzenia. Wysyłka wymaga skonfigurowania własnego serwera lub usługi przyjmującej JSON przez POST. Frontend wysyła pola `name`, `company`, `email`, `phone`, `privacy`, `companyUrl` (pułapka na boty) i opcjonalny `cf-turnstile-response`.

Endpoint musi walidować treść po stronie serwera, ograniczać częstotliwość i rozmiar żądań, sprawdzać pułapkę na boty i token Turnstile, jeśli jest używany. Zwraca kod 2xx po przyjęciu zapytania; inne kody oraz przekroczenie 15 sekund wywołują komunikat błędu bez usuwania tekstu. Publiczne zmienne środowiskowe nie mogą zawierać sekretów.

Uzupełnij również rzeczywiste dane firmy w `src/data/site.ts` oraz istniejący roboczy dokument prywatności. W nawigacji i kontakcie nie publikujemy pustych placeholderów danych firmy. Wizualizacje koncepcyjne usunięto. Prawdziwe projekty dodaje się do tablicy `projects` w `src/data/projects.ts`; ich zrzuty umieszcza się w `public/work/`.

Przed publikacją ustaw właściwą domenę. Bez niej canonical oraz sitemap używają `example.com`. Strona nie została opublikowana przez tę przebudowę.

## Licencje

Kod adaptacji promieni zawiera informację o React Bits. Pełna licencja MIT + Commons Clause znajduje się w `src/vendor/react-bits/LICENSE.md` oraz w dystrybuowanym `public/react-bits-license.txt`. Puste portfolio nie zawiera sztucznych makiet ani zewnętrznych zdjęć. Fonty są lokalnymi zależnościami `@fontsource-variable`.

Wybrane zastąpione pliki poprzedniego projektu zachowano w `docs/previous-design`.

## Aktualizacja 15.09.2026

Porównanie 12 elementów pakietów jest wspólne dla Głównej i Usług (`packageComparison` w `src/data/site.ts`). Każdy pakiet obejmuje pocztę we własnej domenie. Formularz zawiera wyłącznie imię i nazwisko, firmę, e-mail i opcjonalny telefon oraz potwierdzenie prywatności. Światło płynnie przesuwa się pomiędzy lewą i prawą stroną, z pełnym cyklem około 21 sekund; zastępstwa dla ograniczonego ruchu i dotyku pozostają statyczne.
