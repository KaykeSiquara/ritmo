import type { Day } from "./dates";

export type Priority = "high" | "medium" | "low" | "none";
export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type Status = "todo" | "doing" | "done";
export type Lang = "pt" | "en";
export type ProjectColor = "blue" | "green" | "orange" | "red" | "neutral";

export type Subtask = { id: string; title: string; done: boolean };
export type Task = {
  id: string; title: string; notes: string; projectId: string | null; due: Day | null; time: string | null;
  priority: Priority; status: Status; repeat: Repeat; subtasks: Subtask[]; createdAt: string; completedAt: string | null; order: number;
};
export type Project = { id: string; name: string; color: ProjectColor; archived: boolean };
export type Habit = { id: string; name: string; schedule: "daily" | "weekdays"; log: Day[]; createdAt: Day };
export type Session = { id: string; taskId: string | null; day: Day; minutes: number; endedAt: string };
export type Settings = {
  lang: Lang; theme: "light" | "dark" | "system"; density: "comfortable" | "compact"; weekStart: 0 | 1;
  focus: number; short: number; long: number; longEvery: number;
};
