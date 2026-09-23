export type Day = string;

const pad = (n: number) => String(n).padStart(2, "0");

export const toDay = (d: Date): Day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromDay(s: Day): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const todayOf = (now = new Date()): Day => toDay(now);

export function addDays(s: Day, n: number): Day {
  const d = fromDay(s);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function addMonths(s: Day, n: number): Day {
  const d = fromDay(s);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return toDay(target);
}

export const diffDays = (a: Day, b: Day) => Math.round((fromDay(a).getTime() - fromDay(b).getTime()) / 86_400_000);

export const weekday = (s: Day) => fromDay(s).getDay();

export const isWeekend = (s: Day) => weekday(s) === 0 || weekday(s) === 6;

export const startOfWeek = (s: Day, weekStart: 0 | 1) => addDays(s, -((weekday(s) - weekStart + 7) % 7));

export const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDay(fromDay(s)) === s;
