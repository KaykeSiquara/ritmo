import { addDays, diffDays, isWeekend, startOfWeek, type Day } from "./dates";
import type { Habit } from "./types";

export const isScheduled = (day: Day, schedule: Habit["schedule"]) => schedule === "daily" || !isWeekend(day);

export function streaks(h: Habit, today: Day) {
  const done = new Set(h.log);
  const doneToday = done.has(today);
  let current = 0;
  let d = doneToday || !isScheduled(today, h.schedule) ? today : addDays(today, -1);
  while (d >= h.createdAt) {
    if (isScheduled(d, h.schedule)) { if (!done.has(d)) break; current++; }
    d = addDays(d, -1);
  }
  let best = 0, run = 0;
  const first = [h.createdAt, ...h.log].sort()[0];
  for (let x = first; x <= today; x = addDays(x, 1)) {
    if (!isScheduled(x, h.schedule)) continue;
    if (done.has(x)) best = Math.max(best, ++run); else if (x !== today) run = 0;
  }
  return { current, best: Math.max(best, current), doneToday };
}

export type Cell = { day: Day; done: boolean; scheduled: boolean; future: boolean };

export function heatmap(h: Habit, today: Day, weeks: number, weekStart: 0 | 1): Cell[][] {
  const done = new Set(h.log);
  const start = addDays(startOfWeek(today, weekStart), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, w * 7 + i);
      return { day, done: done.has(day), scheduled: isScheduled(day, h.schedule), future: diffDays(day, today) > 0 };
    }),
  );
}

export function rate(h: Habit, today: Day, days: number) {
  const done = new Set(h.log);
  let due = 0, hit = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (d < h.createdAt || !isScheduled(d, h.schedule)) continue;
    due++;
    if (done.has(d)) hit++;
  }
  return due ? hit / due : 0;
}
