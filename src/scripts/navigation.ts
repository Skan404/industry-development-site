export function initNavigation() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const toggle = header?.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const nav = header?.querySelector<HTMLElement>("nav");
  if (!header || !toggle || !nav) return;
  header.dataset.enhanced = "true";
  let open = false;
  let previousY = Math.max(0, window.scrollY);
  let travel = 0;
  let direction = 0;
  let pending = false;
  const show = () => header.removeAttribute("data-hidden");
  const setOpen = (value: boolean, restore = false) => {
    open = value;
    show();
    header.toggleAttribute("data-menu-open", value);
    toggle.setAttribute("aria-expanded", String(value));
    toggle.setAttribute("aria-label", value ? "Zamknij menu" : "Otwórz menu");
    if (value) nav.querySelector<HTMLAnchorElement>("a")?.focus();
    else if (restore) toggle.focus();
  };
  toggle.addEventListener("click", () => setOpen(!open));
  header.addEventListener("focusin", show);
  document.addEventListener("pointerdown", (e) => {
    if (open && e.target instanceof Node && !header.contains(e.target))
      setOpen(false);
  });
  header.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false, true);
    if (e.key !== "Tab" || !open) return;
    const items = [...header.querySelectorAll<HTMLElement>("a[href],button")];
    const first = items[0];
    const last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  });
  nav.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("a") && open)
      setOpen(false);
  });
  window.addEventListener(
    "scroll",
    () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const y = Math.max(
          0,
          Math.min(
            window.scrollY,
            document.documentElement.scrollHeight - window.innerHeight,
          ),
        );
        const delta = y - previousY;
        previousY = y;
        if (y < 90 || open || header.contains(document.activeElement)) {
          show();
          travel = 0;
          return;
        }
        const nextDirection = Math.sign(delta);
        if (nextDirection !== direction) {
          travel = 0;
          direction = nextDirection;
        }
        travel += delta;
        if (travel > 52) header.setAttribute("data-hidden", "true");
        if (travel < -10) show();
      });
    },
    { passive: true },
  );
  const desktop = matchMedia("(min-width: 761px)");
  desktop.addEventListener("change", () => {
    if (open) setOpen(false);
  });
  const group = nav.querySelector<HTMLElement>("[data-gooey-nav]");
  const blob = group?.querySelector<HTMLElement>(".nav-blob");
  if (!group || !blob) return;
  const active = group.querySelector<HTMLElement>('[aria-current="page"]');
  const move = (target: HTMLElement | null) => {
    blob.style.opacity = target ? "1" : "0";
    if (!target) return;
    blob.style.width = `${target.offsetWidth}px`;
    blob.style.transform = `translateX(${target.offsetLeft}px)`;
  };
  group.querySelectorAll<HTMLElement>("a").forEach((link) => {
    link.addEventListener("pointerenter", () => move(link));
    link.addEventListener("focus", () => move(link));
  });
  group.addEventListener("pointerleave", () => move(active));
  group.addEventListener("focusout", () =>
    requestAnimationFrame(() => {
      if (!group.contains(document.activeElement)) move(active);
    }),
  );
  new ResizeObserver(() => move(active)).observe(group);
  move(active);
}
