import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffDays, isDay, startOfWeek, weekday } from "./dates";
import { heatmap, rate, streaks } from "./habits";
import { parseQuickAdd } from "./parser";
import { nextDue } from "./recurrence";
import { advance, formatClock, initialTimer, isFinished, pause, remaining, reset, start } from "./timer";
import type { Habit } from "./types";

const WED = "2026-09-23";
const projects = [{ id: "p1", name: "Trabalho" }, { id: "p2", name: "Estudos de inglês" }, { id: "p3", name: "Work" }];
const pt = (s: string) => parseQuickAdd(s, { today: WED, lang: "pt", projects });
const en = (s: string) => parseQuickAdd(s, { today: WED, lang: "en", projects });

describe("dates", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("clamps months to their last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("counts days without being fooled by daylight saving", () => expect(diffDays("2026-11-10", "2026-10-10")).toBe(31));
  it("finds the start of the week for Sunday and Monday weeks", () => {
    expect(weekday(WED)).toBe(3);
    expect(startOfWeek(WED, 0)).toBe("2026-09-20");
    expect(startOfWeek(WED, 1)).toBe("2026-09-21");
  });
  it("validates day strings", () => {
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("26-2-1")).toBe(false);
  });
});

describe("quick add, Portuguese", () => {
  it("reads date, time, project and priority, and leaves a clean title", () => {
    expect(pt("Enviar relatório amanhã 14h #trabalho !alta")).toEqual({ title: "Enviar relatório", due: "2026-09-24", time: "14:00", priority: "high", projectId: "p1", repeat: "none", unknownProject: null });
  });
  it("matches projects ignoring accents, case and spaces", () => expect(pt("Revisar #estudosdeingles").projectId).toBe("p2"));
  it("keeps an unknown project out of the title and reports it", () => {
    const r = pt("Comprar pão #mercado");
    expect(r.title).toBe("Comprar pão");
    expect(r.unknownProject).toBe("mercado");
  });
  it.each([
    ["hoje", WED], ["amanha", "2026-09-24"], ["depois de amanhã", "2026-09-25"], ["sexta", "2026-09-25"], ["quarta", "2026-09-30"],
    ["próxima segunda-feira", "2026-09-28"], ["em 10 dias", "2026-10-03"], ["dia 5", "2026-10-05"], ["dia 30", "2026-09-30"], ["15/10", "2026-10-15"], ["10/09", "2027-09-10"], ["2026-12-25", "2026-12-25"],
  ])("understands “%s”", (words, due) => expect(pt(`Tarefa ${words}`)).toMatchObject({ title: "Tarefa", due }));
  it.each([["às 9h", "09:00"], ["18h30", "18:30"], ["14:45", "14:45"]])("understands the time “%s”", (words, time) => expect(pt(`Ligar ${words}`).time).toBe(time));
  it("ignores an impossible time", () => expect(pt("Ligar 25h").time).toBeNull());
  it.each([["todo dia", "daily"], ["dias úteis", "weekdays"], ["toda semana", "weekly"], ["todo mês", "monthly"]])("understands the repetition “%s”", (words, repeat) => {
    const r = pt(`Revisar caixa ${words}`);
    expect(r).toMatchObject({ title: "Revisar caixa", repeat, due: WED });
  });
  it("turns “toda segunda” into a weekly task starting next Monday", () => expect(pt("Reunião de equipe toda segunda 10h")).toMatchObject({ title: "Reunião de equipe", repeat: "weekly", due: "2026-09-28", time: "10:00" }));
  it.each([["!media", "medium"], ["p3", "low"], ["!urgente", "high"]])("understands the priority “%s”", (words, priority) => expect(pt(`Algo ${words}`).priority).toBe(priority));
  it("does not read words that only contain a keyword", () => expect(pt("Hojerizar amanhecer")).toMatchObject({ title: "Hojerizar amanhecer", due: null }));
});

describe("quick add, English", () => {
  it("reads a full sentence", () => expect(en("Send report tomorrow at 2:30pm #work p1")).toMatchObject({ title: "Send report", due: "2026-09-24", time: "14:30", priority: "high", projectId: "p3" }));
  it.each([["today", WED], ["friday", "2026-09-25"], ["next wed", "2026-09-30"], ["in 3 days", "2026-09-26"], ["10/15", "2026-10-15"]])("understands “%s”", (words, due) => expect(en(`Task ${words}`)).toMatchObject({ title: "Task", due }));
  it.each([["9am", "09:00"], ["12pm", "12:00"], ["12am", "00:00"], ["at 18:05", "18:05"]])("understands the time “%s”", (words, time) => expect(en(`Call ${words}`).time).toBe(time));
  it("reads “every friday” as a weekly task", () => expect(en("Review week every friday")).toMatchObject({ title: "Review week", repeat: "weekly", due: "2026-09-25" }));
});

describe("recurrence", () => {
  it("moves daily, weekly and monthly tasks", () => {
    expect(nextDue(WED, "daily")).toBe("2026-09-24");
    expect(nextDue(WED, "weekly")).toBe("2026-09-30");
    expect(nextDue("2026-01-31", "monthly")).toBe("2026-02-28");
  });
  it("skips the weekend for weekday tasks", () => expect(nextDue("2026-09-25", "weekdays")).toBe("2026-09-28"));
});

describe("habits", () => {
  const h = (log: string[], schedule: Habit["schedule"] = "daily"): Habit => ({ id: "h", name: "Ler", schedule, log, createdAt: "2026-09-01" });
  it("does not break the streak just because today is not done yet", () => {
    expect(streaks(h(["2026-09-21", "2026-09-22"]), WED)).toEqual({ current: 2, best: 2, doneToday: false });
  });
  it("counts today once it is done", () => expect(streaks(h(["2026-09-21", "2026-09-22", WED]), WED).current).toBe(3));
  it("breaks the streak on a missed day and remembers the best", () => {
    expect(streaks(h(["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-22"]), WED)).toMatchObject({ current: 1, best: 4 });
  });
  it("skips weekends for weekday habits", () => {
    expect(streaks(h(["2026-09-17", "2026-09-18", "2026-09-21", "2026-09-22"], "weekdays"), WED).current).toBe(4);
  });
  it("builds a heatmap of whole weeks ending in the current one", () => {
    const grid = heatmap(h([WED]), WED, 12, 1);
    expect(grid).toHaveLength(12);
    expect(grid[11][2]).toMatchObject({ day: WED, done: true, future: false });
    expect(grid[11][6]).toMatchObject({ future: true });
  });
  it("computes the completion rate over scheduled days only", () => expect(rate(h(["2026-09-22", WED]), WED, 4)).toBe(0.5));
});

describe("focus timer", () => {
  const cfg = { focus: 25, short: 5, long: 15, longEvery: 4 };
  it("counts down from the clock, not from ticks", () => {
    const s = start(initialTimer(cfg), 1_000);
    expect(remaining(s, 1_000 + 60_000)).toBe(24 * 60_000);
    expect(isFinished(s, 1_000 + 25 * 60_000)).toBe(true);
  });
  it("keeps the remaining time across a pause", () => {
    const paused = pause(start(initialTimer(cfg), 0), 10 * 60_000);
    expect(paused).toMatchObject({ running: false, remainingMs: 15 * 60_000 });
    expect(remaining(paused, 99 * 60_000)).toBe(15 * 60_000);
    expect(remaining(start(paused, 100 * 60_000), 101 * 60_000)).toBe(14 * 60_000);
  });
  it("takes a long break after every fourth focus", () => {
    let s = initialTimer(cfg);
    const phases: string[] = [];
    for (let i = 0; i < 8; i++) { s = advance(s, cfg); phases.push(s.phase); }
    expect(phases).toEqual(["short", "focus", "short", "focus", "short", "focus", "long", "focus"]);
  });
  it("resets to the full length of the current phase", () => expect(reset(pause(start(initialTimer(cfg), 0), 5_000), cfg).remainingMs).toBe(25 * 60_000));
  it("formats the clock", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(61_001)).toBe("01:02");
  });
});
