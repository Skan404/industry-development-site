type BookingResult = { ok?: boolean; requestId?: string; date?: string; time?: string; timeZone?: string; slots?: unknown; message?: string };
export function initBookingForm() {
  const form = document.querySelector<HTMLFormElement>("[data-booking-form]");
  if (!form) return;
  const date = form.querySelector<HTMLInputElement>('[name="date"]')!;
  const slots = form.querySelector<HTMLElement>("[data-booking-slots]")!;
  const slotsStatus = form.querySelector<HTMLElement>("[data-slots-status]")!;
  const status = form.querySelector<HTMLElement>("[data-booking-status]")!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const label = form.querySelector<HTMLElement>("[data-booking-submit-label]")!;
  const controls = Array.from(form.querySelectorAll<HTMLFieldSetElement>(".booking-controls"));
  const formatDate = (value: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  let busy = false;
  let locked = false;
  let requestId = crypto.randomUUID();
  let frozen: Record<string, FormDataEntryValue> | null = null;
  let loading: AbortController | null = null;
  let confirmed = false;
  const show = (state: string, text: string) => {
    status.hidden = false; status.dataset.state = state; status.textContent = text; status.focus();
  };
  const setSubmit = () => { submit.disabled = busy || confirmed || form.dataset.enabled !== "true" || (!locked && !form.querySelector('input[name="time"]:checked')); };
  async function loadSlots() {
    loading?.abort();
    const controller = new AbortController(); loading = controller;
    slots.replaceChildren(); setSubmit();
    const chosenDate = date.value;
    if (!chosenDate || !date.checkValidity()) { slotsStatus.textContent = "Wybierz datę w ciągu najbliższych 60 dni."; return; }
    slotsStatus.textContent = "Sprawdzamy dostępne godziny…";
    slots.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("/api/booking/slots?date=" + encodeURIComponent(chosenDate), { headers: { Accept: "application/json" }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      const result: BookingResult = await response.json();
      if (controller !== loading) return;
      if (!response.ok || result.ok !== true || result.date !== chosenDate || result.timeZone !== "Europe/Warsaw" || !Array.isArray(result.slots)) throw new Error(result.message || "Nie możemy teraz sprawdzić terminów. Spróbuj ponownie lub napisz e-mail.");
      const times = result.slots.filter((time: unknown): time is string => typeof time === "string" && /^(1[0-9]):(00|30)$/.test(time));
      for (const time of times) {
        const wrapper = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio"; input.name = "time"; input.value = time; input.required = true; input.setAttribute("aria-label", "Godzina " + time);
        const text = document.createElement("span"); text.textContent = time;
        wrapper.append(input, text); slots.append(wrapper);
      }
      slotsStatus.textContent = times.length ? "Wybierz jedną z dostępnych godzin (czas polski)." : "Brak wolnych godzin w tym dniu. Wybierz inną datę.";
    } catch (error) {
      if (!controller.signal.aborted && controller === loading) {
        slotsStatus.textContent = error instanceof Error ? error.message : "Nie możemy teraz sprawdzić terminów.";
        const retry = document.createElement("button");
        retry.type = "button"; retry.className = "button button--small"; retry.textContent = "Sprawdź ponownie";
        retry.addEventListener("click", () => { void loadSlots(); }); slots.append(retry);
      }
    } finally { if (controller === loading) { slots.removeAttribute("aria-busy"); setSubmit(); } }
  }
  date.min = formatDate(Date.now()); date.max = formatDate(Date.now() + 60 * 86400000);
  date.value = date.min;
  // Start on a weekday; today's remaining hours still come from the server.
  while ([0, 6].includes(new Date(date.value + "T12:00:00Z").getUTCDay())) date.value = formatDate(Date.parse(date.value + "T12:00:00Z") + 86400000);
  date.addEventListener("change", () => { requestId = crypto.randomUUID(); void loadSlots(); });
  form.addEventListener("input", () => { if (!locked) requestId = crypto.randomUUID(); setSubmit(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || confirmed || form.dataset.enabled !== "true") return;
    if (!locked && !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const token = values["cf-turnstile-response"];
    if (typeof token !== "string" || !token) { show("error", "Dokończ weryfikację antyspamową."); return; }
    if (!frozen) frozen = values;
    locked = true; busy = true; controls.forEach(control => { control.disabled = true; });
    form.setAttribute("aria-busy", "true"); label.textContent = "Rezerwujemy…"; setSubmit();
    try {
      const response = await fetch("/api/booking", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...frozen, "cf-turnstile-response": token, requestId }), signal: AbortSignal.timeout(45000),
      });
      const result: BookingResult = await response.json();
      if (!response.ok || result.ok !== true || result.requestId !== requestId || result.date !== frozen.date || result.time !== frozen.time) {
        show("error", result.message || "Nie możemy potwierdzić wyniku. Ponów próbę dla tego samego terminu.");
        if ([400, 403, 409, 413, 415, 422].includes(response.status)) {
          locked = false; frozen = null; requestId = crypto.randomUUID();
          controls.forEach(control => { control.disabled = false; });
          if (response.status === 409) await loadSlots();
        }
        return;
      }
      confirmed = true;
      const chosen = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(new Date(result.date + "T12:00:00Z"));
      show("success", "Spotkanie zarezerwowane: " + chosen + ", godz. " + result.time + " (czas polski), 30 minut. Aby zmienić lub odwołać termin, napisz na kontakt@inddev.pl.");
    } catch {
      show("error", "Utraciliśmy połączenie. Spotkanie mogło zostać zapisane. Ponów potwierdzenie tego samego terminu albo napisz na kontakt@inddev.pl.");
    } finally {
      busy = false; form.removeAttribute("aria-busy");
      label.textContent = confirmed ? "Spotkanie zarezerwowane" : locked ? "Sprawdź tę rezerwację ponownie" : "Umów spotkanie";
      setSubmit();
      const turnstile = (window as unknown as { turnstile?: { reset: () => void } }).turnstile;
      turnstile?.reset();
    }
  });
  if (form.dataset.enabled === "true") void loadSlots();
  else slotsStatus.textContent = "Rezerwacje nie są jeszcze dostępne. Napisz na kontakt@inddev.pl.";
}
