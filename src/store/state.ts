import { isDay, type Day } from "../domain/dates";
import { nextDue } from "../domain/recurrence";
import { initialTimer, type TimerState } from "../domain/timer";
import { translateDemo } from "./demoText";
import type { Habit, Project, Session, Settings, Status, Subtask, Task } from "../domain/types";

export type State = { tasks: Task[]; projects: Project[]; habits: Habit[]; sessions: Session[]; settings: Settings; timer: TimerState };
export type Undoable = { state: State; label: string };

export type Action =
  | { type: "task/add"; task: Partial<Task> & { title: string }; now: Date }
  | { type: "task/update"; id: string; patch: Partial<Task> }
  | { type: "task/toggle"; id: string; today: Day; now: Date }
  | { type: "task/delete"; id: string }
  | { type: "task/move"; id: string; status: Status; before?: string | null; now: Date }
  | { type: "subtask/add"; taskId: string; title: string }
  | { type: "subtask/toggle"; taskId: string; id: string }
  | { type: "subtask/delete"; taskId: string; id: string }
  | { type: "project/add"; project: Omit<Project, "id" | "archived"> }
  | { type: "project/update"; id: string; patch: Partial<Project> }
  | { type: "project/delete"; id: string }
  | { type: "habit/add"; habit: Pick<Habit, "name" | "schedule">; today: Day }
  | { type: "habit/toggle"; id: string; day: Day }
  | { type: "habit/delete"; id: string }
  | { type: "session/add"; session: Omit<Session, "id"> }
  | { type: "settings/update"; patch: Partial<Settings> }
  | { type: "timer/set"; timer: TimerState }
  | { type: "data/replace"; state: State };

export const DEFAULT_SETTINGS: Settings = { lang: "pt", theme: "system", density: "comfortable", weekStart: 1, focus: 25, short: 5, long: 15, longEvery: 4 };

let counter = 0;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function emptyState(settings: Partial<Settings> = {}): State {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return { tasks: [], projects: [], habits: [], sessions: [], settings: s, timer: initialTimer(s) };
}

const maxOrder = (tasks: Task[]) => tasks.reduce((m, t) => Math.max(m, t.order), 0);

export const UNDOABLE = new Set<Action["type"]>(["task/toggle", "task/delete", "task/move", "project/delete", "habit/delete"]);

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "task/add": {
      const t = action.task;
      const task: Task = {
        id: uid("t"), title: t.title.trim(), notes: t.notes ?? "", projectId: t.projectId ?? null, due: t.due ?? null, time: t.time ?? null,
        priority: t.priority ?? "none", status: t.status ?? "todo", repeat: t.repeat ?? "none", subtasks: t.subtasks ?? [],
        createdAt: action.now.toISOString(), completedAt: null, order: maxOrder(state.tasks) + 1,
      };
      if (!task.title) return state;
      return { ...state, tasks: [...state.tasks, task] };
    }
    case "task/update":
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch, id: t.id } : t)) };
    case "task/toggle": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      if (t.status === "done") return { ...state, tasks: state.tasks.map((x) => (x.id === t.id ? { ...x, status: "todo", completedAt: null } : x)) };
      const completedAt = action.now.toISOString();
      if (t.repeat === "none") return { ...state, tasks: state.tasks.map((x) => (x.id === t.id ? { ...x, status: "done", completedAt } : x)) };
      const record: Task = { ...t, id: uid("t"), status: "done", completedAt, repeat: "none", order: maxOrder(state.tasks) + 1 };
      const due = nextDue(t.due ?? action.today, t.repeat);
      const next = { ...t, status: "todo" as const, due: due < action.today ? nextDue(action.today, t.repeat) : due, subtasks: t.subtasks.map((s) => ({ ...s, done: false })) };
      return { ...state, tasks: [...state.tasks.map((x) => (x.id === t.id ? next : x)), record] };
    }
    case "task/delete":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id), timer: state.timer.taskId === action.id ? { ...state.timer, taskId: null } : state.timer };
    case "task/move": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return state;
      const column = state.tasks.filter((x) => x.status === action.status && x.id !== t.id && x.projectId === t.projectId).sort((a, b) => a.order - b.order);
      const at = action.before ? column.findIndex((x) => x.id === action.before) : -1;
      const prev = at > 0 ? column[at - 1].order : at === 0 ? column[0].order - 2 : null;
      const order = at === -1 ? (column.length ? column[column.length - 1].order + 1 : t.order) : ((prev ?? column[at].order - 2) + column[at].order) / 2;
      const moved: Task = { ...t, status: action.status, order, completedAt: action.status === "done" ? t.completedAt ?? action.now.toISOString() : null };
      return { ...state, tasks: state.tasks.map((x) => (x.id === t.id ? moved : x)) };
    }
    case "subtask/add": {
      const title = action.title.trim();
      if (!title) return state;
      const sub: Subtask = { id: uid("s"), title, done: false };
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t)) };
    }
    case "subtask/toggle":
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, subtasks: t.subtasks.map((s) => (s.id === action.id ? { ...s, done: !s.done } : s)) } : t)) };
    case "subtask/delete":
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== action.id) } : t)) };
    case "project/add": {
      const name = action.project.name.trim();
      if (!name) return state;
      return { ...state, projects: [...state.projects, { id: uid("p"), name, color: action.project.color, archived: false }] };
    }
    case "project/update":
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch, id: p.id } : p)) };
    case "project/delete":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.id), tasks: state.tasks.map((t) => (t.projectId === action.id ? { ...t, projectId: null } : t)) };
    case "habit/add": {
      const name = action.habit.name.trim();
      if (!name) return state;
      return { ...state, habits: [...state.habits, { id: uid("h"), name, schedule: action.habit.schedule, log: [], createdAt: action.today }] };
    }
    case "habit/toggle":
      return { ...state, habits: state.habits.map((h) => (h.id !== action.id ? h : { ...h, log: h.log.includes(action.day) ? h.log.filter((d) => d !== action.day) : [...h.log, action.day].sort() })) };
    case "habit/delete":
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) };
    case "session/add":
      return { ...state, sessions: [...state.sessions, { ...action.session, id: uid("f") }] };
    case "settings/update": {
      const next = { ...state, settings: { ...state.settings, ...action.patch } };
      return action.patch.lang && action.patch.lang !== state.settings.lang ? translateDemo(next, state.settings.lang, action.patch.lang) : next;
    }
    case "timer/set":
      return { ...state, timer: action.timer };
    case "data/replace":
      return action.state;
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const str = (x: unknown) => typeof x === "string";

export function validate(input: unknown): State | null {
  if (!isObj(input) || !Array.isArray(input.tasks) || !Array.isArray(input.projects) || !Array.isArray(input.habits) || !Array.isArray(input.sessions) || !isObj(input.settings)) return null;
  const tasksOk = input.tasks.every((t) => isObj(t) && str(t.id) && str(t.title) && ["todo", "doing", "done"].includes(t.status as string) && (t.due === null || isDay(t.due)) && Array.isArray(t.subtasks));
  const projectsOk = input.projects.every((p) => isObj(p) && str(p.id) && str(p.name));
  const habitsOk = input.habits.every((h) => isObj(h) && str(h.id) && str(h.name) && Array.isArray(h.log) && (h.log as unknown[]).every(isDay));
  if (!tasksOk || !projectsOk || !habitsOk) return null;
  const settings = { ...DEFAULT_SETTINGS, ...(input.settings as Partial<Settings>) };
  const timer = isObj(input.timer) && typeof input.timer.remainingMs === "number" ? (input.timer as unknown as TimerState) : initialTimer(settings);
  return { tasks: input.tasks as Task[], projects: input.projects as Project[], habits: input.habits as Habit[], sessions: input.sessions as Session[], settings, timer };
}

