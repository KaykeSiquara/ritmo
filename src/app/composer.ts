const EVENT = "ritmo:composer";
const emit = () => window.dispatchEvent(new Event(EVENT));

export const composer = {
  event: EVENT,
  isOpen: () => document.documentElement.dataset.composer === "open",
  open: () => {
    document.documentElement.dataset.composer = "open";
    emit();
    requestAnimationFrame(() => document.getElementById("quick-add")?.focus());
  },
  close: (returnFocus = true) => {
    if (document.documentElement.dataset.composer !== "open") return;
    delete document.documentElement.dataset.composer;
    emit();
    if (returnFocus) document.querySelector<HTMLElement>(".fab")?.focus();
  },
};

export const isCompact = () => typeof matchMedia === "function" && matchMedia("(max-width: 1023px)").matches;
export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
