import { addDays, isWeekend, type Day } from "../domain/dates";
import type { Habit, Lang, Project, Session, Task } from "../domain/types";
import { TEXT } from "./demoText";
import { emptyState, type State } from "./state";

function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seed(lang: Lang, today: Day): State {
  const r = prng(2026);
  const tx = TEXT[lang];
  const base = emptyState({ lang });
  const projects: Project[] = tx.projects.map((name, i) => ({ id: `p${i + 1}`, name, color: (["blue", "green", "orange"] as const)[i], archived: false }));
  const at = (day: Day, h: number) => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d, h, Math.floor(r() * 59)).toISOString(); };
  let order = 0;
  const tasks: Task[] = tx.tasks.map(([title, p, offset, priority, repeat, status, time], i) => ({
    id: `t${i + 1}`, title, notes: i === 0 ? tx.notes : "", projectId: p === null ? null : projects[p].id, due: offset === null ? null : addDays(today, offset), time,
    priority, status, repeat, subtasks: i === 0 ? tx.subtasks.map((s, j) => ({ id: `s${j + 1}`, title: s, done: j === 0 })) : [],
    createdAt: at(addDays(today, -10), 9), completedAt: null, order: ++order,
  }));
  for (let i = 0; i < 26; i++) {
    const day = addDays(today, -1 - Math.floor(r() * 13));
    tasks.push({
      id: `d${i + 1}`, title: tx.done[i % tx.done.length], notes: "", projectId: projects[i % 3].id, due: day, time: null, priority: "none", status: "done",
      repeat: "none", subtasks: [], createdAt: at(addDays(day, -2), 9), completedAt: at(day, 10 + Math.floor(r() * 8)), order: ++order,
    });
  }
  const habits: Habit[] = tx.habits.map(([name, schedule], i) => {
    const log: Day[] = [];
    for (let d = 1; d <= 84; d++) {
      const day = addDays(today, -d);
      if (schedule === "weekdays" && isWeekend(day)) continue;
      if (d <= 3 + i * 2 || r() < 0.72 - i * 0.08) log.push(day);
    }
    return { id: `h${i + 1}`, name, schedule, log: log.sort(), createdAt: addDays(today, -84) };
  });
  const sessions: Session[] = [];
  for (let d = 1; d <= 13; d++) {
    const day = addDays(today, -d);
    const n = isWeekend(day) ? Math.floor(r() * 2) : 1 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) sessions.push({ id: `f${d}_${k}`, taskId: tasks[k % 5].id, day, minutes: 25, endedAt: at(day, 9 + k * 2) });
  }
  return { ...base, projects, tasks, habits, sessions };
}
