# Kontrola przebudowy — 14.09.2026

## Automatycznie

- `npm run build`: Astro check i statyczna kompilacja.
- `npm run lint`: ESLint dla głównego projektu. Dwa niezależne podprojekty wyłączone z zakresu jego konfiguracji.
- `npm run test`: 6 testów cyklu życia animacji (kontrolowane środowisko DOM/Canvas i zegar).

Testy obejmują brak inicjalizacji poza ekranem, zatrzymywanie i wznawianie, limit DPR, preferencję ograniczonego ruchu, wskaźnik dotykowy, zmianę preferencji podczas działania, ukrytą kartę, powrót przez pageshow, brak WebGL oraz wygaszenie Cursor Grid.

## W przeglądarce

- Główna przy 1280 × 720: tekst i CTA widoczne od początku, prawidłowe mieszanie promieni z ciemną bazą, brak błędów konsoli.
- Proporcja pierwszej strefy: ok. 30% długości strony przy układzie komputerowym; koniec efektu zgodny z naturalną granicą sekcji.
- Przewijanie w dół ukrywa wyspę; ruch w górę o ok. 29 px przywraca ją. Promienie przestają renderować po opuszczeniu ich sekcji, piksele pracują w następnej strefie.
- Główna przy 390 × 844: mobilny układ hero, dwa CTA, widoczna wskazówka przewijania, wyspa odsunięta od krawędzi.
- Mobilne menu: otwarcie przenosi fokus do linku, przewijanie nie chowa wyspy, Escape zamyka i przywraca fokus przyciskowi.
- Usługi przy 320 × 740: brak poziomego przewijania po poprawce szerokości minimalnej, poprawna aktywna zakładka i działające rozwijanie FAQ.
- Kontakt przy 390 px: wybór pakietu Rozwój z adresu, walidacja pustych pól, fokus na pierwszym błędzie; późniejsza poprawka układa pola w jednej kolumnie.
- Kontakt przy 1440 × 900: dwukolumnowy układ, czytelna siatka tła, spójność nagłówków i karty formularza.
- Kompletny formularz z fikcyjnymi danymi lokalnymi: brak endpointu daje wyraźną informację o niewysłaniu, bez usunięcia treści. Nie wysłano danych do zewnętrznego serwera.

## Granice sprawdzenia

Testy preferencji ruchu, dotyku i niedostępności WebGL są testami logiki, nie pomiarami na fizycznym telefonie. Nie wykonano pełnego audytu WCAG, pomiaru Lighthouse ani testu rzeczywistego dostarczenia e-maila. Obsługa wysyłki, dane firmy, domena i robocza polityka prywatności wymagają konfiguracji przed publikacją. Źródła i licencję efektów sprawdzono w repozytorium React Bits; nie instalowano oryginalnych komponentów React.

## Aktualizacja 15.09.2026

Usunięto koncepcyjne wizualizacje z głównej. Dodano porównanie 12 elementów pakietów, pocztę w każdym pakiecie oraz osobną pustą podstronę Realizacje. Formularz ma wyłącznie dane kontaktowe, a efekty światła płynnie przemieszczają się od lewej do prawej i z powrotem.

Kontrola w przeglądarce: 12 wierszy tabeli, brak dawnych wizualizacji, brak poziomego przepełnienia całej strony na komputerze i przy 390 px; tabela ma własny obszar przewijania. Formularz zawiera name/company/email/phone, bez select i textarea; po pustej próbie wysłania fokus wraca do pola imienia. Testy cyklu życia animacji nadal przechodzą (6/6).
