# Oferta IndDev — zmiana i kontrola 9.10.2026

Status: przygotowane i sprawdzone lokalnie. Szymon zatwierdził publikację 9.10.2026. Wdrożenie w Cloudflare i odbiór produkcyjny nowego cennika pozostają do potwierdzenia.

## Decyzje Szymona

- Start: 199 zł netto miesięcznie, dodano założenie lub uporządkowanie Profilu Firmy w Google (wizytówka / pinezka).
- Rozwój: 399 zł netto miesięcznie zamiast 499 zł; dodano formularze interaktywne, rezerwacje i powiadomienia SMS.
- Premium: 799 zł netto miesięcznie; formularze jak w Rozwoju oraz sekretarka AI do odbierania połączeń i obsługi zapytań.
- Zużycie SMS i sekretarki AI dodatkowo płatne według zużycia. Nie zatwierdzono nowych stawek ani limitów; zasady rozliczenia ustala indywidualna umowa przed uruchomieniem.

Wspólne dane z src/data/site.ts aktualizują stronę główną, /uslugi, tabelę porównania i FAQ. Ujednolicono informację o kosztach również w regulaminie. Model minimum 24 miesiące, 0 zł wdrożenia, czasy drobnych zmian i odpowiedzi zachowano. Baza wiedzy została zaktualizowana lokalnie; była wcześniej nieśledzonym plikiem.

## Kontrola

- npm run build:cloudflare: Astro 0 błędów, 0 ostrzeżeń; build i kontrola metadanych / linków / sitemap zaliczone.
- npm run check:cloudflare: dry-run zaliczony, bez publikacji.
- Lint kodu IndDev (src, worker, scripts, tests i konfiguracje): zaliczony. Pełny workspace lint nie był powtarzany; wcześniejsza kontrola wykazała niezależne błędy projektów klientów.
- Edge headless: strona główna i /uslugi, widoki 1440×1000 i 390×844. Ceny 199 / 399 / 799, nowe funkcje, właściwe zaznaczenia tabeli, dodatkowe koszty, działający FAQ, brak przepełnienia poziomego i błędów JS.
- Regulamin w obu widokach zawiera informację o osobnym rozliczeniu SMS / AI.
- Obejrzano desktop.png i mobile.png w output/oferta-2026-10-09.
- Zmieniono teksty oferty; nie uruchamiano nowych usług u klientów i nie zmieniano backendu rezerwacji. Oferta sekretarki AI nie potwierdza połączenia obecnego agenta ElevenLabs z kalendarzem.
- Zachowano wcześniejszą zmianę Szymona w src/styles/global.css i niezależne projekty.
