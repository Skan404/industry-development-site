import business from "../../config/site.json";

export const siteConfig = {
  legalName: business.brand,
  descriptor: "Niezależne studio cyfrowe",
  owner: business.companyName,
  phone: business.contactPhone,
  email: business.contactEmail,
  calendarUrl: "",
  nip: business.nip,
  address: `${business.street}, ${business.postalCode} ${business.city}`,
  privacyUpdatedAt: "15 września 2026 r.",
  location: "Płońsk, województwo mazowieckie",
  serviceArea: "Płońsk i okolice oraz zdalnie cała Polska",
  defaultDescription:
    "Projektowanie stron internetowych dla firm z Płońska i całej Polski. Strony w abonamencie od 199 zł netto miesięcznie, hosting, poczta i stała opieka.",
} as const;

export const navigation = [
  { href: "/", label: "Główna" },
  { href: "/uslugi", label: "Usługi" },
  { href: "/realizacje", label: "Realizacje" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export type PackageId = "start" | "rozwoj" | "premium";

export interface Package {
  id: PackageId;
  name: string;
  price: number;
  description: string;
  badge?: string;
  highlighted?: boolean;
  features: readonly string[];
  changes: string;
  response: string;
}

export const packages: readonly Package[] = [
  {
    id: "start",
    name: "Start",
    price: 199,
    description:
      "Twoja strona i firmowa poczta. Wszystko, czego potrzebujesz na początek.",
    features: [
      "Strona, hosting, SSL, formularz i utrzymanie",
      "Firmowa poczta we własnej domenie",
      "Link do opinii, kod QR i projekt karty",
      "Nowe realizacje w ramach czasu zmian",
    ],
    changes: "15 minut drobnych zmian miesięcznie",
    response: "Pierwsza odpowiedź: do 3 dni roboczych",
  },
  {
    id: "rozwoj",
    name: "Rozwój",
    price: 499,
    badge: "Strona + obecność lokalna",
    highlighted: true,
    description:
      "Wszystko ze Startu oraz regularna opieka nad Twoją obecnością w Google.",
    features: [
      "Strona, hosting, SSL, formularz i utrzymanie",
      "Firmowa poczta we własnej domenie",
      "Link do opinii, kod QR i projekt karty",
      "Założenie lub uporządkowanie profilu Google",
      "Kontrola profilu raz w miesiącu + zgłoszone zmiany",
      "2 publikacje / mies. i odpowiedzi na wszystkie opinie",
      "Nowe realizacje w ramach czasu zmian",
    ],
    changes: "30 minut drobnych zmian miesięcznie",
    response: "Pierwsza odpowiedź: do 2 dni roboczych",
  },
  {
    id: "premium",
    name: "Premium",
    price: 799,
    description:
      "Rozbudowana opieka Google oraz narzędzia do obsługi zapytań i rezerwacji.",
    features: [
      "Strona, hosting, SSL, formularz i utrzymanie",
      "Firmowa poczta we własnej domenie",
      "Link do opinii, kod QR i projekt karty",
      "4 publikacje / mies. i odpowiedzi na wszystkie opinie",
      "Założenie lub uporządkowanie profilu Google i stała opieka",
      "Rezerwacje lub rozbudowany formularz wyceny",
      "1 scenariusz automatycznego porządkowania zapytań",
      "1 nowa realizacja miesięcznie poza limitem zmian",
    ],
    changes: "60 minut drobnych zmian miesięcznie",
    response: "Pierwsza odpowiedź: do 1 dnia roboczego",
  },
] as const;

export const packageComparison: readonly {
  label: string;
  values: readonly [string, string, string];
}[] = [
  {
    label: "Strona, hosting, SSL, formularz i utrzymanie",
    values: ["✓", "✓", "✓"],
  },
  { label: "Firmowa poczta we własnej domenie", values: ["✓", "✓", "✓"] },
  {
    label: "Założenie lub uporządkowanie Profilu Firmy w Google",
    values: ["—", "✓", "✓"],
  },
  {
    label: "Aktualizacja godzin, usług i danych wizytówki",
    values: [
      "—",
      "Kontrola raz w miesiącu + zgłoszone zmiany",
      "Jak w Rozwoju",
    ],
  },
  {
    label: "Publikacje w wizytówce",
    values: ["—", "2 miesięcznie", "4 miesięcznie"],
  },
  {
    label: "Odpowiedzi na opinie",
    values: ["—", "Wszystkie opinie", "Wszystkie opinie"],
  },
  {
    label: "Zestaw do zbierania opinii",
    values: ["Link, kod QR i projekt karty do wydruku", "Jak w Starcie", "Jak w Starcie"],
  },
  {
    label: "Rezerwacje lub rozbudowany formularz wyceny",
    values: ["—", "—", "Jeden wybrany moduł"],
  },
  {
    label: "Automatyczne porządkowanie zapytań",
    values: ["—", "—", "Jeden ustalony scenariusz"],
  },
  {
    label: "Publikacja nowej realizacji na stronie",
    values: [
      "W ramach czasu zmian",
      "W ramach czasu zmian",
      "1 miesięcznie, poza limitem zmian",
    ],
  },
  {
    label: "Drobne zmiany na stronie",
    values: ["15 min/mies.", "30 min/mies.", "60 min/mies."],
  },
  {
    label: "Pierwsza odpowiedź na zgłoszenie",
    values: [
      "Do 3 dni roboczych",
      "Do 2 dni roboczych",
      "Do 1 dnia roboczego",
    ],
  },
];

export const pricingNote =
  "Ceny netto dla firm. Po 24 miesiącach klient może kontynuować opiekę albo przejąć witrynę na zasadach określonych w umowie. Szczegółowy zakres potwierdzamy przed rozpoczęciem.";

// UWAGA PRAWNA: finalne warunki pakietów, przeniesienia witryny i rezygnacji
// wymagają zatwierdzenia po przygotowaniu właściwej umowy B2B.

export const faqs = [
  {
    question: "Czy naprawdę nie ma opłaty za wdrożenie?",
    answer:
      "Tak. W modelu abonamentowym opłata wdrożeniowa wynosi 0 zł przy umowie B2B na minimum 24 miesiące. Koszt domeny i usług zewnętrznych potrzebnych do realizacji zakresu pakietu jest wliczony w abonament.",
  },
  {
    question: "Dlaczego okres minimalny wynosi 24 miesiące?",
    answer:
      "Koszt projektu, wdrożenia i późniejszej opieki jest rozłożony na przewidywalne płatności miesięczne. Dzięki temu firma nie ponosi wysokiego kosztu na początku, a studio może zapewniać stałe utrzymanie strony.",
  },
  {
    question: "Co dzieje się po 24 miesiącach?",
    answer:
      "Możesz kontynuować opiekę albo przejąć witrynę na zasadach zapisanych w umowie. Dokładne warunki ustalamy i potwierdzamy przed rozpoczęciem współpracy.",
  },
  {
    question: "Czy domena będzie należeć do mnie?",
    answer:
      "Tak, rekomendowane jest zarejestrowanie domeny bezpośrednio na dane Twojej firmy. Jeśli jej jeszcze nie masz, pomogę przejść przez konfigurację.",
  },
  {
    question: "Ile poprawek mogę zgłosić?",
    answer:
      "Na etapie projektu uzgadniamy kierunek i zakres rund poprawek w briefie. Po publikacji każdy pakiet zawiera miesięczny limit drobnych zmian: 15, 30 lub 60 minut.",
  },
  {
    question: "Jak długo trwa przygotowanie strony?",
    answer:
      "Termin zależy od pakietu, zakresu i gotowości materiałów. Po krótkiej rozmowie otrzymasz realny harmonogram. Prosta strona jednostronicowa powstaje szybciej niż strona z rozbudowanym portfolio i integracją.",
  },
  {
    question: "Czy strona będzie pozycjonować się w Google?",
    answer:
      "Strona otrzyma solidne podstawy techniczne SEO: właściwą strukturę, metadane, wydajność i właściwe dane strukturalne. Pozycje w wynikach zależą jednak także od konkurencji, treści i dalszych działań — nie składam obietnic bez pokrycia.",
  },
  {
    question: "Czy mogę zrezygnować wcześniej?",
    answer:
      "Zasady wcześniejszego zakończenia współpracy będą opisane w umowie B2B. Przed podpisaniem otrzymasz warunki do spokojnego przeczytania, w tym okres minimalny i rozliczenie ewentualnego zakończenia.",
  },
  {
    question: "Czy muszę dostarczyć gotowe teksty i zdjęcia?",
    answer:
      "Nie musisz mieć gotowego tekstu. Pomogę uporządkować najważniejsze informacje, a zakres tej pomocy zależy od pakietu. Zdjęcia powinny być Twoje lub pochodzić z legalnego źródła; wspólnie ustalimy, czego potrzeba.",
  },
] as const;

export const routes = [
  "/realizacje",
  "/",
  "/uslugi",
  "/kontakt",
  "/polityka-prywatnosci",
] as const;
