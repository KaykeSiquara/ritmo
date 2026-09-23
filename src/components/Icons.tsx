import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", width: "1em", height: "1em", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };

export const IconToday = (p: P) => <svg {...base} {...p}><path d="M12 3.5l2.47 5 5.53.8-4 3.9.94 5.5L12 16.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z" fill="currentColor" stroke="none" /></svg>;
export const IconUpcoming = (p: P) => <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><circle cx="8.5" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" /></svg>;
export const IconInbox = (p: P) => <svg {...base} {...p}><path d="M3.5 13.5l2.6-7.2A2 2 0 0 1 8 5h8a2 2 0 0 1 1.9 1.3l2.6 7.2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-4.5z" /><path d="M3.5 13.5h4.5l1.5 2.5h5l1.5-2.5h4.5" /></svg>;
export const IconFocus = (p: P) => <svg {...base} {...p}><circle cx="12" cy="13" r="7.5" /><path d="M12 13V9.5M9.5 2.5h5" /></svg>;
export const IconHabits = (p: P) => <svg {...base} {...p}><path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-3.4 2.6-5.4 3.8-8.8.3 2 1.4 3.2 2.5 3.8.2-2.6 1.6-4.7 3.4-6.3.2 3.1 3.3 5.2 3.3 10.1C18.5 17.9 15.9 21 12 21z" fill="currentColor" stroke="none" /></svg>;
export const IconInsights = (p: P) => <svg {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
export const IconSettings = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
export const IconMenu = (p: P) => <svg {...base} {...p}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>;
export const IconPlus = (p: P) => <svg {...base} strokeWidth={2.6} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconSearchSmall = (p: P) => <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconProject = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" /></svg>;
