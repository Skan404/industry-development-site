# Rezerwacje IndDev — konfiguracja i odbiór

Status: kod przygotowany lokalnie. Ten dokument nie potwierdza publikacji, autoryzacji Google ani doręczenia SMS.

## Uzgodniony zakres

- Podstrona /umow-spotkanie, spotkania 30 minut, pon.–pt. 10:00–20:00, ostatni start 19:30.
- Strefa Europe/Warsaw, poprawne przesunięcie czasu letniego/zimowego.
- Wydarzenie we wskazanym przez Szymona kalendarzu Google, bez Google Meet i bez automatycznego zaproszenia e-mail dla gościa.
- SMS wyłącznie na wskazany numer komórkowy właściciela. Numer recepcjonistki w Zadarma nie jest odbiorcą powiadomień.
- Horyzont dostępności: najbliższe 60 dni. To przyjęte ustawienie techniczne; HORIZON_DAYS jest w worker/booking-time.mjs.
- Dni świąteczne nie mają osobnej listy. Właściciel blokuje dni lub godziny jako wydarzenia oznaczone „Zajęty” w Google Calendar.
- Anulowanie lub zmiana: klient pisze na kontakt@inddev.pl, Szymon usuwa/przenosi wydarzenie w kalendarzu. Stary termin zwalnia się po ponownym sprawdzeniu dostępności.
- Obecna integracja obsługuje formularz WWW. Nie zmienia agenta ElevenLabs ani routingu numeru Zadarma. Recepcjonistka nie korzysta jeszcze ze wspólnego systemu blokad.

## 1. Google — jednorazowe upoważnienie

Odpowiedzialny: właściciel konta Google. Potrzebne: dostęp do właściwego kalendarza i projektu Google Cloud.

1. W Google Cloud utwórz lub wybierz projekt i włącz Google Calendar API.
2. Skonfiguruj Google Auth Platform / ekran zgody dla aplikacji używanej przez właściciela. Dla osobistego konta Gmail użyj aplikacji External. Nie pozostawiaj jej w trybie Testing do długotrwałego działania: refresh token z zakresem Calendar w tym trybie może wygasnąć po 7 dniach.
3. Utwórz klienta OAuth typu Web application. Do kontrolowanego, jednorazowego uzyskania refresh tokenu możesz użyć oficjalnego OAuth 2.0 Playground. W Authorized redirect URIs dodaj https://developers.google.com/oauthplayground.
4. W Playground zaznacz „Use your own OAuth credentials”, wpisz własny Client ID/Client Secret lokalnie w przeglądarce. Nie wysyłaj ich do czatu.
5. Autoryzuj konto mające uprawnienie do tworzenia wydarzeń w uzgodnionym kalendarzu. Wymagane zakresy:
   - https://www.googleapis.com/auth/calendar.events
   - https://www.googleapis.com/auth/calendar.freebusy
6. Uzyskaj refresh token (dostęp offline). Przenieś go bezpośrednio do sekretów Workera. Używaj własnego klienta OAuth, a nie domyślnych poświadczeń Playground.
7. GOOGLE_CALENDAR_ID ustaw zgodnie z identyfikatorem kalendarza podanym w rozmowie. Publiczny adres osadzenia kalendarza nie zastępuje autoryzacji zapisu. Nie trzeba upubliczniać kalendarza.
8. Jeśli konflikt ma być sprawdzany również w innych kalendarzach, dodaj ich identyfikatory w BOOKING_BUSY_CALENDAR_IDS, rozdzielone przecinkami. Konto OAuth musi mieć do nich dostęp; niedostępny kalendarz blokuje rezerwacje zamiast udawać wolne terminy.

Wynik: Client ID, Client Secret i refresh token w sekretach Cloudflare. Brak autoryzacji: formularz uczciwie zgłasza niedostępność.

## 2. Zadarma — SMS do właściciela

Odpowiedzialny: właściciel konta Zadarma.

1. W panelu Zadarma wygeneruj klucz i sekret API zgodnie z dokumentacją dostawcy.
2. Sprawdź aktywność wysyłania SMS i saldo dla numeru docelowego. Wykupiony numer głosowy nie potwierdza aktywnej wysyłki SMS.
3. Dodaj ZADARMA_API_KEY i ZADARMA_API_SECRET jako sekrety Workera.
4. BOOKING_SMS_TO ustaw na uzgodniony w rozmowie numer komórkowy właściciela w formacie międzynarodowym (+48…).
5. Opcjonalnie ustaw ZADARMA_SMS_SENDER wyłącznie na nadawcę dopuszczonego przez Zadarma. Listę uzyskuje się przez /v1/sms/senderid/. Nie zakładaj, że numer recepcjonistki jest uprawnionym nadawcą.
6. Wiadomość jest krótka, w ASCII: data, godzina i informacja, że szczegóły są w Google Calendar. Nie zawiera danych klienta.

Koszt: publiczny cennik Zadarma dla Polski, sprawdzony 9.10.2026, podaje 0,035 USD dla Alpha SenderID i 0,04 USD z numerów komórkowych za SMS (https://zadarma.com/pl/tariffs/sms/poland/). Saldo i rozliczenie na koncie właściciela nie zostały potwierdzone. Nie ustalono stawki w kodzie. API jest dostępne niezależnie od agenta ElevenLabs.

## 3. Cloudflare — sekrety i publikacja

Odpowiedzialny: Szymon / upoważniona osoba wdrażająca. Konfiguracja kont i publikacja wymagają oddzielnego upoważnienia.

Settings → Variables and Secrets dla Workera inddev:
- TURNSTILE_SECRET — dotychczasowy sekret (widget używa action booking dla rezerwacji i contact dla zapytań).
- GOOGLE_CALENDAR_ID
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN
- ZADARMA_API_KEY
- ZADARMA_API_SECRET
- BOOKING_SMS_TO
- ZADARMA_SMS_SENDER — opcjonalnie.
- BOOKING_BUSY_CALENDAR_IDS — opcjonalnie.

Nie zapisuj wartości w publicznych zmiennych PUBLIC_*, Git ani instrukcjach. Plik .dev.vars jest ignorowany przez Git; .dev.vars.example zawiera tylko puste wzorce.

wrangler.jsonc dodaje BOOKINGS (SQLite Durable Object), migrację booking-v1, nodejs_compat oraz BOOKING_LIMITER. SQLite Durable Objects są dostępne na Workers Free w limitach dostawcy; nie trzeba automatycznie zmieniać planu na płatny.

Kontrole: npm test, npm run lint, npm run build:cloudflare, npm run check:cloudflare. Dry-run nie tworzy zasobów na koncie. Po konfiguracji i upoważnieniu wykonaj publikację zgodnie z docs/CLOUDFLARE.md.

## 4. Odbiór po publikacji

Odpowiedzialny: Szymon. Użyj własnych danych i przyszłego, wolnego terminu. Test generuje rzeczywiste wydarzenie i płatną wiadomość SMS.

1. Sprawdź podstronę na telefonie i komputerze oraz wybór daty/godziny klawiaturą.
2. Zablokuj wybrany termin wydarzeniem „Zajęty” w kalendarzu: musi zniknąć z dostępnych godzin. Sprawdź również wydarzenie całodniowe i częściowo nakładające się.
3. Zarezerwuj wolny termin: na stronie pojawia się potwierdzenie, w odpowiednim kalendarzu dokładnie jedno wydarzenie 30 minut, na właściwym telefonie SMS.
4. Spróbuj zarezerwować ten sam termin w drugiej karcie. Nie może powstać drugie wydarzenie.
5. Po utracie odpowiedzi ponów tę samą rezerwację bez zmiany danych. Sprawdź brak drugiego wydarzenia i powtórnego SMS.
6. Usuń/przenieś testowe wydarzenie w Google. Odśwież wybór daty i sprawdź zwolnienie starej godziny.
7. Zweryfikuj błąd integracji w oddzielnym środowisku testowym: brak dostępu Google, odmowę SMS, brak odpowiedzi. Nie zmieniaj produkcyjnych kluczy w celu testu awarii.
8. Usuń własne testowe wydarzenie. Zapisz datę kontroli i dowody odbioru; dopiero wtedy oznacz wdrożenie jako potwierdzone na produkcji.

## Zachowanie przy awarii i ograniczenia

- Trwały zapis requestId, skrótu danych i blokady terminu oraz stały identyfikator Google zapobiegają duplikatom przy ponowieniu z tym samym requestId. Token Turnstile trzeba odnowić.
- Kolejka pojedynczego Durable Object serializuje rezerwacje strony. Wydarzenia dodane ręcznie lub przez niezależnego agenta mogą powstać między sprawdzeniem Google a zapisem — Calendar API nie ma atomowej operacji „sprawdź i zarezerwuj”. Aby objąć recepcjonistkę tym samym zabezpieczeniem, potrzebna jest osobna, uwierzytelniona integracja z tym backendem.
- Blokada pozostaje przy niejednoznacznym błędzie Google. Alarm podejmuje do 5 prób odzyskania, następnie termin pozostaje zablokowany i wymaga sprawdzenia przez właściciela. Nie usuwaj blokady, dopóki nie sprawdzisz identyfikatora wydarzenia; nie twórz zastępczego wydarzenia na ślepo.
- Po potwierdzeniu Google przechowujemy stan próby SMS. accepted oznacza przyjęcie przez Zadarma, nie doręczenie do telefonu. failed/unknown/unconfigured wymagają kontroli konta Zadarma. Brak SMS nie anuluje istniejącego spotkania.
- Nie ponawiamy automatycznie SMS po niejednoznacznym wyniku ani po restarcie w trakcie wysyłki (stan sending), ponieważ API nie zapewnia tu potwierdzonej idempotencji. Właściciel powinien sprawdzić historię dostawcy przed ręcznym ponowieniem.
- Dane techniczne w Durable Object są automatycznie usuwane około 30 dni po spotkaniu (alarm dzienny). Dane kontaktowe w Google pozostają zgodnie z retencją zarządzaną przez właściciela. Nie rejestrujemy danych formularza w logach.
- Ponowienie z nowym requestId to nowa rezerwacja. Przeglądarka zachowuje identyfikator w pamięci bieżącej strony, nie po jej zamknięciu. Po niejasnym wyniku nie wybieraj innego terminu bez sprawdzenia poprzedniego.
- Rezerwacje wymagają działającego JavaScript, Turnstile oraz integracji Google. Alternatywa: kontakt e-mail.
- Zmiany polityki prywatności opisują przygotowaną funkcję; nie są potwierdzeniem weryfikacji prawnej ani zatwierdzenia warunków dostawców.

## Źródła techniczne sprawdzone 9.10.2026

- Google Calendar insert: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google Calendar FreeBusy: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- OAuth / offline access: https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth token expiration: https://developers.google.com/identity/protocols/oauth2#expiration
- Zadarma API (autoryzacja, SMS, nadawca): https://zadarma.com/en/support/api/
- Cloudflare Durable Objects i limity: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare SQLite storage: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
