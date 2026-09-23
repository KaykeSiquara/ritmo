import { addDays, diffDays, type Day } from "../domain/dates";
import type { Priority, Task } from "../domain/types";
import type { State } from "./state";

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };
export const byUrgency = (a: Task, b: Task) =>
  (a.due ?? "9999").localeCompare(b.due ?? "9999") || (a.time ?? "99").localeCompare(b.time ?? "99") || RANK[a.priority] - RANK[b.priority] || a.order - b.order;

export const open = (s: State) => s.tasks.filter((t) => t.status !== "done");
export const activeProjects = (s: State) => s.projects.filter((p) => !p.archived);

export function today(s: State, day: Day) {
  const due = open(s).filter((t) => t.due !== null && t.due <= day).sort(byUrgency);
  return { overdue: due.filter((t) => t.due! < day), today: due.filter((t) => t.due === day), doneToday: s.tasks.filter((t) => t.status === "done" && t.completedAt && localDay(t.completedAt) === day) };
}

export function upcoming(s: State, day: Day, days = 7) {
  const tasks = open(s);
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(day, i + 1);
    return { day: d, tasks: tasks.filter((t) => t.due === d).sort(byUrgency) };
  });
}

export const inbox = (s: State) => open(s).filter((t) => t.projectId === null).sort(byUrgency);

export const projectTasks = (s: State, id: string) => s.tasks.filter((t) => t.projectId === id);

export function board(s: State, id: string) {
  const mine = projectTasks(s, id).sort((a, b) => a.order - b.order);
  return { todo: mine.filter((t) => t.status === "todo"), doing: mine.filter((t) => t.status === "doing"), done: mine.filter((t) => t.status === "done") };
}

export function localDay(iso: string): Day {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function insights(s: State, day: Day, days = 14) {
  const series = Array.from({ length: days }, (_, i) => {
    const d = addDays(day, i - days + 1);
    return {
      day: d,
      completed: s.tasks.filter((t) => t.status === "done" && t.completedAt && localDay(t.completedAt) === d).length,
      focus: s.sessions.filter((x) => x.day === d).reduce((a, x) => a + x.minutes, 0),
    };
  });
  const completed = series.reduce((a, x) => a + x.completed, 0);
  const focus = series.reduce((a, x) => a + x.focus, 0);
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].completed > 0) streak++;
    else if (i === series.length - 1) continue;
    else break;
  }
  const overdue = open(s).filter((t) => t.due !== null && diffDays(t.due, day) < 0).length;
  return { series, completed, focus, streak, overdue, activeDays: series.filter((x) => x.completed > 0).length };
}

export function search(s: State, q: string, limit = 6) {
  const f = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = f(q.trim());
  if (!term) return [];
  return s.tasks.filter((t) => f(t.title).includes(term) || f(t.notes).includes(term)).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || byUrgency(a, b)).slice(0, limit);
}
