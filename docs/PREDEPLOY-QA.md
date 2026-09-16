# Odbiór przed konfiguracją usług — 16.09.2026

Status: kod i paczka przygotowane do etapu konfiguracji Hostido i Cloudflare. Nie jest to potwierdzenie gotowości skonfigurowanej produkcji ani publicznej wysyłki poczty.

## Akceptacja właściciela

Użytkownik zaakceptował dane firmy, ofertę, politykę prywatności, regulamin i końcowy wygląd (w tym na telefonie). Nie wymagają ponownego zatwierdzenia przy niezmienionym zakresie.

## Wykonane kontrole

- Build: 9 stron, Astro check bez błędów, ostrzeżeń i wskazówek.
- ESLint i git diff --check.
- 12 testów JavaScript: formularz, idempotencja, obsługa błędów, cykl życia efektów, ograniczony ruch, brak WebGL, ukryta karta, efekty poza ekranem.
- PHP: kontrola składni 6 plików, 34 sprawdzenia backendu; transport SMTP i weryfikacja Turnstile symulowane, bez wysyłania wiadomości.
- Kontrola wygenerowanego HTML: tytuły, opisy, dokładne canonicale, pojedynczy H1, brak przeskoków poziomów nagłówków, atrybuty alt, lokalne odnośniki do plików, sitemap, noindex pustych Realizacji i grafika OG.
- Przegląd źródeł: obecne obrazy treści są przewidziane dla przyszłych Realizacji z osobnym imageAlt. Obecnie portfolio jest puste; dekoracje są wykonane w kodzie.
- Przegląd źródeł połączeń: lokalne fonty; Turnstile ładowany dopiero po aktywowaniu formularza; brak opcjonalnej analityki. Pełny audyt ruchu produkcji zostaje po konfiguracji usług.
- Przegląd w przeglądarce: główna, Usługi, Realizacje, Kontakt, Prywatność, Regulamin i 404 przy 390, 768 i 1440 px — bez poziomego przepełnienia dokumentu, jeden H1, brak obrazów bez alt.
- Mobilne menu: otwarcie przenosi fokus do linku; Escape zamyka i przywraca fokus przycisku.
- Formularz mobilny: błędny e-mail daje komunikat i aria-invalid; fokus jest widoczny. Przycisk wysyłki pozostaje wyłączony przed konfiguracją; dostępny adres e-mail.
- Tabela ma własny obszar przewijania, etykietę regionu, nagłówki wierszy/kolumn i reaguje na klawisz strzałki.
- Wizualnie sprawdzono stronę 404, główną i mobilny formularz; nie stwierdzono błędów konsoli w sprawdzanym podglądzie.
- Usunięto nieużywane HeroVisual, OwnerPlaceholder, ProjectShowcase, ArrowLink, SectionHeader oraz przykładowe dane projektów koncepcyjnych. Pozostałe historyczne selektory CSS nie były usuwane masowo, aby uniknąć zmian zaakceptowanego wyglądu.
- Paczka: 134 pliki, zgodność manifestu SHA256, wymagane ścieżki, brak prywatnego config.php, .env, repozytorium, testów i lokalnych narzędzi; skan typowych wzorców sekretów oraz testowych adresów w plikach publicznych. To kontrola określonych wzorców, nie gwarancja wykrycia każdego możliwego sekretu.

## Wydajność i ograniczenia pomiaru

Zewnętrzne zasoby JS wszystkich podstron: 9904 B, około 4263 B gzip; CSS: 44156 B, około 10792 B gzip. To suma zasobów _astro, nie całej strony — nie obejmuje fontów, HTML i skryptów inline. Potwierdzono testami zatrzymywanie rendererów poza ekranem i statyczne tło dla ograniczonego ruchu/wskaźnika dotykowego.

Nie wykonano Lighthouse, pomiaru FPS/CPU/GPU ani pełnego audytu WCAG/kontrastu. Interfejs narzędzia przeglądarkowego nie udostępnił Performance API do wiarygodnego pomiaru. Nie oznaczać tych pomiarów jako zaliczonych. Wykonać pomiar produkcyjnej strony po włączeniu rzeczywistych usług, wraz z testem dostarczania poczty. Kontrola układu i akceptacja właściciela nie zastępują pełnego audytu dostępności.

## Następny etap

Postępować według HOSTIDO.md: konfiguracja prywatnego backendu, skrzynki SMTP, Turnstile, domeny i TLS, ponowny build z prawdziwym publicznym kluczem i aktywnym formularzem, check:production, ponowne wygenerowanie paczki. Bieżąca paczka świadomie nie zawiera kluczy i nie aktywuje wysyłki.

Na rzeczywistym serwerze zweryfikować przekierowania i status 404, CSP, cache, cookies/połączenia zewnętrzne, cron retencji, adres IP za proxy oraz pełną ścieżkę wysyłki. Nie zmieniono kont Hostido ani Cloudflare.
