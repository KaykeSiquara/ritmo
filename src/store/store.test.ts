import { describe, expect, it, vi } from "vitest";
import { board, inbox, insights, search, today, upcoming } from "./selectors";
import { seed } from "./seed";
import { emptyState, reducer, validate, type State } from "./state";
import { createStore, load, STORAGE_KEY } from "./store";

const DAY = "2026-09-23";
const NOW = new Date(2026, 8, 23, 12, 0);
const run = (s: State, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);

describe("tasks", () => {
  it("adds a task at the end and ignores an empty title", () => {
    const s = run(emptyState(), { type: "task/add", task: { title: "  Ligar  " }, now: NOW }, { type: "task/add", task: { title: "   " }, now: NOW });
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ title: "Ligar", status: "todo", priority: "none", order: 1 });
  });
  it("completes and reopens a one-off task", () => {
    let s = run(emptyState(), { type: "task/add", task: { title: "A" }, now: NOW });
    const id = s.tasks[0].id;
    s = reducer(s, { type: "task/toggle", id, today: DAY, now: NOW });
    expect(s.tasks[0]).toMatchObject({ status: "done", completedAt: NOW.toISOString() });
    s = reducer(s, { type: "task/toggle", id, today: DAY, now: NOW });
    expect(s.tasks[0]).toMatchObject({ status: "todo", completedAt: null });
  });
  it("moves a recurring task forward and keeps a record of the completion", () => {
    let s = run(emptyState(), { type: "task/add", task: { title: "Relatório", due: DAY, repeat: "weekly", subtasks: [{ id: "x", title: "a", done: true }] }, now: NOW });
    s = reducer(s, { type: "task/toggle", id: s.tasks[0].id, today: DAY, now: NOW });
    expect(s.tasks).toHaveLength(2);
    expect(s.tasks[0]).toMatchObject({ status: "todo", due: "2026-09-30", subtasks: [{ done: false }] });
    expect(s.tasks[1]).toMatchObject({ status: "done", repeat: "none", due: DAY });
  });
  it("does not schedule an overdue recurring task in the past", () => {
    let s = run(emptyState(), { type: "task/add", task: { title: "Água", due: "2026-09-01", repeat: "daily" }, now: NOW });
    s = reducer(s, { type: "task/toggle", id: s.tasks[0].id, today: DAY, now: NOW });
    expect(s.tasks[0].due).toBe("2026-09-24");
  });
  it("moves a card between board columns and places it before another", () => {
    let s = run(emptyState(), ...["A", "B", "C"].map((title) => ({ type: "task/add" as const, task: { title, projectId: "p" }, now: NOW })));
    const [a, b, c] = s.tasks;
    s = reducer(s, { type: "task/move", id: c.id, status: "todo", before: a.id, now: NOW });
    expect(board(s, "p").todo.map((t) => t.title)).toEqual(["C", "A", "B"]);
    s = reducer(s, { type: "task/move", id: b.id, status: "done", now: NOW });
    expect(board(s, "p").done.map((t) => t.title)).toEqual(["B"]);
    expect(s.tasks.find((t) => t.id === b.id)!.completedAt).not.toBeNull();
  });
  it("sends tasks of a deleted project to the inbox", () => {
    let s = run(emptyState(), { type: "project/add", project: { name: "X", color: "blue" } });
    const p = s.projects[0].id;
    s = run(s, { type: "task/add", task: { title: "Da X", projectId: p }, now: NOW }, { type: "project/delete", id: p });
    expect(inbox(s).map((t) => t.title)).toEqual(["Da X"]);
  });
});

describe("store", () => {
  it("undoes the last destructive action once", () => {
    const store = createStore(run(emptyState(), { type: "task/add", task: { title: "A" }, now: NOW }), false);
    const id = store.get().tasks[0].id;
    store.dispatch({ type: "task/delete", id });
    expect(store.get().tasks).toHaveLength(0);
    expect(store.undo()).toBe(true);
    expect(store.get().tasks).toHaveLength(1);
    expect(store.undo()).toBe(false);
  });
  it("persists to localStorage and loads it back", async () => {
    vi.useFakeTimers();
    const store = createStore(emptyState({ lang: "en" }));
    store.dispatch({ type: "task/add", task: { title: "Saved" }, now: NOW });
    vi.advanceTimersByTime(200);
    vi.useRealTimers();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(1);
    expect(load("en").tasks.map((t) => t.title)).toEqual(["Saved"]);
  });
  it("falls back to demo data when storage is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(load("pt").projects.map((p) => p.name)).toEqual(["Trabalho", "Pessoal", "Estudos"]);
  });
  it("rejects imports with the wrong shape", () => {
    expect(validate({ tasks: [{ id: 1 }], projects: [], habits: [], sessions: [], settings: {} })).toBeNull();
    expect(validate({ tasks: [], projects: [], habits: [], sessions: [], settings: { lang: "en" } })?.settings.lang).toBe("en");
  });
});

describe("language of the demo data", () => {
  it("translates the demo content the person has not touched, and nothing else", () => {
    let s = seed("pt", DAY);
    s = reducer(s, { type: "task/update", id: "t2", patch: { title: "Contrato revisado por mim" } });
    s = reducer(s, { type: "task/add", task: { title: "Comprar pão" }, now: NOW });
    s = reducer(s, { type: "settings/update", patch: { lang: "en" } });
    const title = (id: string) => s.tasks.find((t) => t.id === id)!.title;
    expect(title("t4")).toBe("Pay the electricity bill");
    expect(title("t2")).toBe("Contrato revisado por mim");
    expect(s.tasks.at(-1)!.title).toBe("Comprar pão");
    expect(s.tasks[0]).toMatchObject({ notes: "The receipts are in the finance shared folder.", subtasks: [{ title: "Check the receipts" }, { title: "Attach the invoices" }, { title: "Send to the coordinator" }] });
    expect(s.projects.map((p) => p.name)).toEqual(["Work", "Personal", "Studies"]);
    expect(s.habits.map((h) => h.name)).toEqual(["Read 20 minutes", "Workout", "Drink 2 liters of water"]);
    expect(s.tasks.filter((t) => t.status === "done").every((t) => !/[ãçõ]|Fechar|Ligar/.test(t.title))).toBe(true);
    s = reducer(s, { type: "settings/update", patch: { lang: "pt" } });
    expect(title("t4")).toBe("Pagar a conta de luz");
  });
  it("also translates the completed copy of a repeating demo task", () => {
    let s = seed("pt", DAY);
    s = reducer(s, { type: "task/toggle", id: "t4", today: DAY, now: NOW });
    s = reducer(s, { type: "settings/update", patch: { lang: "en" } });
    expect(s.tasks.filter((t) => t.title === "Pay the electricity bill")).toHaveLength(2);
  });
});

describe("selectors on the demo data", () => {
  const s = seed("pt", DAY);
  it("seeds in the chosen language", () => expect(seed("en", DAY).projects.map((p) => p.name)).toEqual(["Work", "Personal", "Studies"]));
  it("splits overdue from today, sorted by time and priority", () => {
    const t = today(s, DAY);
    expect(t.overdue.map((x) => x.title)).toEqual(["Pagar a conta de luz"]);
    expect(t.today[0].time).toBe("09:00");
    expect(t.today.every((x) => x.due === DAY)).toBe(true);
  });
  it("groups the next seven days", () => {
    const u = upcoming(s, DAY);
    expect(u).toHaveLength(7);
    expect(u[0]).toMatchObject({ day: "2026-09-24" });
    expect(u[0].tasks.map((x) => x.title)).toContain("Preparar a apresentação do trimestre");
  });
  it("counts completions and focus per day", () => {
    const i = insights(s, DAY);
    expect(i.series).toHaveLength(14);
    expect(i.completed).toBe(26);
    expect(i.focus).toBeGreaterThan(0);
  });
  it("searches titles and notes without accents", () => {
    expect(search(s, "apresentacao")[0].title).toBe("Preparar a apresentação do trimestre");
    expect(search(s, "pasta compartilhada")[0].title).toBe("Enviar a prestação de contas de setembro");
  });
});
