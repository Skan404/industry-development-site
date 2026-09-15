const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(max-width: 760px)");
const targets = Array.from(document.querySelectorAll<HTMLElement>(
  ".section-heading, .service-card, .process-grid > li, .pricing-card, .comparison-heading, .comparison-scroll, .faq-section > div:first-child, .faq-item, .subpage-hero > p, .subpage-hero > a, .service-detail, .included-strip, .portfolio-empty, .portfolio-item, .contact-details, .form-card, .closing-card",
));
const animations = new Set<Animation>();
const reveal = (element: HTMLElement, delay = 0) => {
  element.classList.remove("reveal-pending");
  if (reduced.matches || element.contains(document.activeElement)) return;
  const animation = element.animate([
    { opacity: 0, transform: `translateY(${mobile.matches ? 14 : 28}px)` },
    { opacity: 1, transform: "translateY(0)" },
  ], { duration: mobile.matches ? 480 : 720, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
  animations.add(animation);
  animation.onfinish = () => animations.delete(animation);
};
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    visible.forEach((entry, index) => {
      observer.unobserve(entry.target);
      reveal(entry.target as HTMLElement, mobile.matches ? 0 : Math.min(index * 140, 420));
    });
  }, { threshold: 0, rootMargin: "0px 0px -160px 0px" });
  targets.forEach(element => {
    if (!reduced.matches && element.getBoundingClientRect().top > window.innerHeight) element.classList.add("reveal-pending");
    observer.observe(element);
    element.addEventListener("focusin", () => {
      element.classList.remove("reveal-pending");
      element.getAnimations().forEach(animation => animation.cancel());
      observer.unobserve(element);
    });
  });
  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;
    targets.forEach(element => element.classList.remove("reveal-pending"));
    animations.forEach(animation => animation.cancel());
    animations.clear();
  });
}

const heading = document.querySelector<HTMLElement>("[data-typewriter]");
const first = heading?.querySelector<HTMLElement>("[data-type-first]");
const prefix = heading?.querySelector<HTMLElement>("[data-type-prefix]");
const ending = heading?.querySelector<HTMLElement>("[data-type-ending]");
const pause = document.querySelector<HTMLButtonElement>("[data-type-pause]");

// Preserve line breaks and emphasis while reserving the complete heading height.
document.querySelectorAll<HTMLElement>(".subpage-hero h1").forEach(title => {
  if (reduced.matches || !("IntersectionObserver" in window)) return;
  const fullText = title.innerText.replace(/\s+/g, " ").trim();
  const reserve = document.createElement("span");
  reserve.className = "type-once-reserve";
  const text = document.createElement("span");
  while (title.firstChild) text.append(title.firstChild);
  reserve.append(...Array.from(text.childNodes, node => node.cloneNode(true)));
  reserve.setAttribute("aria-hidden", "true");
  text.setAttribute("aria-hidden", "true");
  title.setAttribute("aria-label", fullText);
  title.classList.add("type-once");
  title.append(reserve, text);
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  const parts: { node: Node; value: string }[] = [];
  while (walker.nextNode()) parts.push({ node: walker.currentNode, value: walker.currentNode.textContent ?? "" });
  parts.forEach(part => { part.node.textContent = ""; });
  const length = parts.reduce((sum, part) => sum + part.value.length, 0);
  let count = 0;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { clearTimeout(timer); timer = undefined; };
  const paint = () => {
    let remaining = count;
    parts.forEach(part => {
      part.node.textContent = part.value.slice(0, Math.max(0, remaining));
      remaining -= part.value.length;
    });
  };
  const run = () => {
    stop();
    if (!visible || document.hidden || count >= length) return;
    timer = setTimeout(() => { count++; paint(); run(); }, 45 + Math.random() * 45);
  };
  const observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    run();
  });
  observer.observe(title);
  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;
    stop(); count = length; paint(); observer.disconnect();
  });
  document.addEventListener("visibilitychange", run);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", run);
});

if (heading && first && prefix && ending && pause && "IntersectionObserver" in window) {
  const phrases = ["Jej nowy wymiar.", "Jej nowa strona.", "Jej nowa reklama.", "Jej nowi klienci."] as const;
  let phase: "first" | "typing" | "deleting" = "first";
  let position = 0;
  let phrase = 0;
  let visible = false;
  let paused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { clearTimeout(timer); timer = undefined; };
  const paint = () => {
    const text = (phrases[phrase] ?? phrases[0]).slice(0, position);
    prefix.textContent = text.slice(0, 4);
    ending.textContent = text.slice(4);
  };
  const schedule = (delay: number) => {
    stop();
    if (!visible || paused || reduced.matches || document.hidden) return;
    timer = setTimeout(tick, delay);
  };
  const tick = () => {
    let delay = 65 + Math.random() * 55;
    if (phase === "first") {
      first.textContent = "Twoja firma.".slice(0, ++position);
      if (position === "Twoja firma.".length) { phase = "typing"; position = 0; delay = 350; }
    } else if (phase === "typing") {
      position++;
      paint();
      if (position === (phrases[phrase] ?? phrases[0]).length) { phase = "deleting"; delay = 2400; }
    } else {
      position--;
      paint();
      delay = 35 + Math.random() * 30;
      if (position === 0) { phrase = (phrase + 1) % phrases.length; phase = "typing"; delay = 400; }
    }
    schedule(delay);
  };
  const reset = () => {
    stop();
    first.textContent = "Twoja firma.";
    prefix.textContent = "Jej ";
    ending.textContent = "nowy wymiar.";
    phase = "deleting"; phrase = 0; position = phrases[0].length;
    pause.hidden = reduced.matches;
  };
  if (!reduced.matches) {
    first.textContent = ""; prefix.textContent = ""; ending.textContent = "";
    pause.hidden = false;
  }
  new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    if (visible) schedule(350); else stop();
  }).observe(heading);
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : schedule(500));
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", () => schedule(500));
  reduced.addEventListener("change", () => { reset(); schedule(2400); });
  pause.addEventListener("click", () => {
    paused = !paused;
    pause.textContent = paused ? "Wznów animację tekstu" : "Wstrzymaj animację tekstu";
    pause.setAttribute("aria-pressed", String(paused));
    if (paused) stop(); else schedule(350);
  });
}
