# Animacje i źródła

Referencje sprawdzono 14 września 2026 r. w oficjalnym repozytorium [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits/tree/3a1c7f2f9f94ed833934ab5c2635760b9e644583). Identyfikator wersji zapisano również w `src/vendor/react-bits/COMMIT`.

## Zastosowanie

| Referencja i aktualne API | Implementacja w tej witrynie |
| --- | --- |
| [Light Rays](https://reactbits.dev/backgrounds/light-rays): React + OGL; `raysOrigin`, `raysColor`, `raysSpeed`, `lightSpread`, `rayLength`, `followMouse`, `mouseInfluence` | Adaptacja funkcji siły promieni do natywnego WebGL 1 w `src/scripts/effects.ts`. Miętowy kolor, wyraźne płynne przesuwanie źródła od lewej do prawej i z powrotem (około 21 s na cykl), szybszy ruch pasm i nieznaczna reakcja na kursor. |
| [Pixel Blast](https://reactbits.dev/backgrounds/pixel-blast): React + Three.js + postprocessing; `variant`, `pixelSize`, `color`, `patternScale`, `patternDensity`, `enableRipples`, `rippleSpeed` | Własna, uproszczona interpretacja w Canvas 2D: kwadratowe punkty, wolne fale i maksymalnie trzy rozchodzące się impulsy. Bez shaderów FBM i ciekłej dystorsji z oryginału. |
| [Gooey Nav](https://reactbits.dev/components/gooey-nav): React + CSS; `items`, `initialActiveIndex`, `animationTime`, `particleCount` | Autorska adaptacja do prawdziwych odnośników Astro: miękko przemieszczające się podświetlenie i aktywny adres strony. Spokojniejsza wersja bez rozprysku cząstek. |
| [Border Glow](https://reactbits.dev/components/border-glow): React + CSS; `edgeSensitivity`, `glowColor`, `glowIntensity`, `animated` | Obramowanie z maskowanym gradientem stożkowym sterowanym pozycją kursora. Karty usług, ceny i końcowe CTA; bez nieustannego obrotu. |
| [Specular Button](https://reactbits.dev/components/specular-button): React + OGL/WebGL2; `radius`, `lineColor`, `shineSize`, `shineFade`, `followMouse`, `autoAnimate` | Własny odpowiednik CSS: dwa refleksy na krawędziach, lokalne światło i subtelne uniesienie. Jeden wspólny styl, bez osobnego kontekstu WebGL dla każdego przycisku. |
| [Cursor Grid](https://reactbits.dev/animations/cursor-grid): React + Canvas 2D; `cellSize`, `radius`, `holdTime`, `fadeDuration`, `gridOpacity`, `clickPulse` | Własna siatka Canvas 2D na Usługach i Kontakcie. Reaguje na mysz i kliknięcie, wygasa, po czym całkowicie zatrzymuje pętlę. |

To adaptacje i własne interpretacje referencji, a nie instalacja niezmienionych komponentów React. Witryna pozostaje w Astro; nie dodano React, Three.js, postprocessing ani OGL. Treść, linki i formularz są renderowane niezależnie od efektów.

## Licencja

Repozytorium stosuje **MIT + Commons Clause**. Aktualny tekst ze sprawdzonej wersji zezwala na wykorzystanie komponentów jako części aplikacji lub witryny, również komercyjnej, a ogranicza sprzedaż, sublicencjonowanie i redystrybucję samych komponentów, w tym portów. Pełny oryginalny tekst zachowano w `src/vendor/react-bits/LICENSE.md` i `public/react-bits-license.txt`. Komentarz licencyjny zachowany w bundlu wskazuje tę kopię. Projekt jest witryną studia, nie biblioteką komponentów na sprzedaż.

## Wydajność i dostępność

- Light Rays obejmuje naturalny blok hero + trzy karty usług, ok. 30% długości głównej przy szerokości 1280 px. Proporcja może zmieniać się wraz z układem. Na końcu strefy promienie zanikają, a piksele stopniowo narastają na tym samym kolorze bazowym.
- Canvas ma wysokość ekranu i przesuwa się wewnątrz strefy przez `position: sticky`; nie tworzymy bitmapy o wysokości całej strony.
- Maksymalnie 30 klatek/s i DPR 1,25. `IntersectionObserver`, `visibilitychange` oraz `pagehide/pageshow` zatrzymują i wznawiają pracę. Cursor Grid po wygaszeniu nie renderuje klatek.
- `prefers-reduced-motion`, `hover: none` lub `pointer: coarse`: nie tworzymy kontekstów; widoczne są statyczne tła CSS. Zmiana preferencji podczas oglądania jest obsłużona.
- Brak WebGL, błąd kompilacji lub utrata kontekstu nie blokują treści. Utrata kontekstu pokazuje tło CSS, jego odzyskanie odbudowuje efekt.
- Tła i pseudo-elementy mają `pointer-events: none` oraz `aria-hidden`. Nasłuchiwanie wskaźnika jest pasywne, bez anulowania zdarzeń treści.
- Nawigacja: 52 px w dół do ukrycia, 10 px w górę do pokazania; do 90 px od początku zawsze widoczna. Zmiana kierunku zeruje licznik. Fokus i otwarte menu wymuszają widoczność. Escape zamyka menu i oddaje fokus przyciskowi.
- Formularz zachowuje treść przy błędzie, wiąże komunikaty z polami, przenosi fokus do pierwszego błędu i nie udaje wysłania bez endpointu. Gdy brak obsługi wysyłki, umożliwia pobranie kopii wiadomości jako pliku tekstowego. Żadne dane formularza nie są zapisywane w localStorage.

## Weryfikacja

`npm run test` sprawdza cykl życia efektów z kontrolowanym zegarem, widocznością, wskaźnikiem i preferencjami ruchu. `npm run build` obejmuje kontrolę typów Astro. Kontrola UI odbywa się dodatkowo w rzeczywistej przeglądarce; szczegóły w `docs/QA.md`.
