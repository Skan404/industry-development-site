export function initContactForms() {
  const forms = document.querySelectorAll<HTMLFormElement>("[data-contact-form]");
  const messages: Record<string, string> = {
    name: "Wpisz imię i nazwisko (do 100 znaków).",
    company: "Wpisz nazwę firmy (do 160 znaków).",
    email: "Podaj poprawny adres e-mail.",
    phone: "Podaj poprawny numer telefonu lub pozostaw pole puste.",
  };
  forms.forEach(form => {
    form.noValidate = true;
    const fields = Array.from(form.querySelectorAll<HTMLInputElement>(".form-grid input"));
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const label = form.querySelector<HTMLElement>("[data-submit-label]");
    const status = form.querySelector<HTMLElement>("[data-form-status]");
    if (!submit || !label || !status) return;
    let busy = false;
    let requestId = crypto.randomUUID();
    const show = (state: string, text: string) => {
      status.dataset.state = state; status.hidden = false; status.textContent = text; status.focus();
    };
    const validate = (field: HTMLInputElement) => {
      const phoneValid = field.name !== "phone" || field.value === "" || /^\+?[0-9 ()\-.]{6,40}$/.test(field.value);
      const valid = phoneValid && field.checkValidity() && (!field.required || field.value.trim().length > 0);
      const error = form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
      field.setAttribute("aria-invalid", String(!valid));
      if (error) error.textContent = valid ? "" : (messages[field.name] ?? "Sprawdź to pole.");
      return valid;
    };
    fields.forEach(field => {
      const error = form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
      if (error) { error.id = `${field.id}-error`; field.setAttribute("aria-describedby", error.id); }
      field.addEventListener("blur", () => validate(field));
      field.addEventListener("input", () => {
        requestId = crypto.randomUUID();
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy) return;
      const invalid = fields.filter(field => !validate(field));
      if (invalid.length) {
        show("error", "Sprawdź oznaczone pola i spróbuj ponownie."); invalid[0]?.focus(); return;
      }
      const endpoint = form.dataset.endpoint;
      if (!endpoint) { show("notice", "Formularz nie jest jeszcze dostępny. Napisz do nas e-mail."); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data["cf-turnstile-response"]) { show("error", "Dokończ weryfikację antyspamową. Jeśli nie jest dostępna, napisz do nas e-mail."); return; }
      busy = true; submit.disabled = true;
      fields.forEach(field => { field.readOnly = true; });
      form.setAttribute("aria-busy", "true"); label.textContent = "Wysyłanie…";
      status.hidden = false; status.textContent = "Wysyłamy zgłoszenie. Poczekaj na potwierdzenie.";
      try {
        const response = await fetch(endpoint, {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, requestId }), signal: AbortSignal.timeout(45000),
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true || result.requestId !== requestId) {
          const fallback = response.status === 429 ? "Zbyt wiele zgłoszeń. Spróbuj później lub napisz e-mail." : "Nie udało się potwierdzić wysyłki. Spróbuj później lub napisz e-mail.";
          show("error", typeof result.message === "string" ? result.message : fallback); return;
        }
        form.reset(); requestId = crypto.randomUUID();
        fields.forEach(field => field.removeAttribute("aria-invalid"));
        show("success", "Dziękujemy — zgłoszenie zostało przyjęte do wysyłki. Odpowiemy w ciągu 1 dnia roboczego.");
      } catch {
        show("error", "Nie udało się potwierdzić wysyłki. Twoje dane pozostały w formularzu. Możesz ponowić próbę lub napisać e-mail.");
      } finally {
        busy = false; submit.disabled = false;
        fields.forEach(field => { field.readOnly = false; });
        form.removeAttribute("aria-busy"); label.textContent = "Wyślij zapytanie";
        const turnstile = (window as unknown as { turnstile?: { reset: () => void } }).turnstile;
        turnstile?.reset();
      }
    });
  });
}
