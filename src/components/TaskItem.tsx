import { IconCheck, useToast } from "@kaykesiquara/prumo";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { reducedMotion } from "../app/composer";
import { useApp, useSelect, useToday } from "../app/context";
import type { Priority, Task } from "../domain/types";
import { useI18n, type Key } from "../i18n";

const PRIORITY_KEY: Record<Priority, Key> = { high: "pHigh", medium: "pMedium", low: "pLow", none: "pNone" };
const REPEAT_KEY = { none: "rNone", daily: "rDaily", weekdays: "rWeekdays", weekly: "rWeekly", monthly: "rMonthly" } as const;

export function useToggleTask() {
  const store = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const today = useToday();
  return (task: Task) => {
    const done = task.status === "done";
    store.dispatch({ type: "task/toggle", id: task.id, today, now: new Date() });
    toast(t(done ? "reopened" : "completed", { title: task.title }), { tone: done ? "neutral" : "success", action: { label: t("undo"), onClick: () => store.undo() } });
  };
}

export function TaskItem({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const { t, dueLabel } = useI18n();
  const today = useToday();
  const [, setParams] = useSearchParams();
  const project = useSelect((s) => s.projects.find((p) => p.id === task.projectId));
  const toggle = useToggleTask();
  const [leaving, setLeaving] = useState(false);
  const done = task.status === "done";
  const onCheck = () => {
    if (done || reducedMotion()) { toggle(task); return; }
    setLeaving(true);
    setTimeout(() => toggle(task), 420);
  };
  const due = task.due ? dueLabel(task.due, today) : null;
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <li className="task" data-done={done || undefined} data-leaving={leaving || undefined} data-priority={task.priority} data-task-id={task.id}>
      <span className="check">
        <input type="checkbox" className="check__input" checked={done || leaving} onChange={onCheck} disabled={leaving} aria-label={t(done ? "reopen" : "complete", { title: task.title })} />
        <IconCheck className="check__mark" />
      </span>
      <div className="task__body">
        <button type="button" className="task__title" onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set("task", task.id); return n; })}>
          {task.title}
          {task.priority !== "none" && <span className="pr-visually-hidden">, {t(PRIORITY_KEY[task.priority])}</span>}
        </button>
        <p className="task__meta">
          {due && <span className="task__due" data-overdue={due.overdue && !done ? true : undefined}>{due.overdue && !done && <span aria-hidden="true">! </span>}{due.text}{task.time ? ` · ${task.time}` : ""}</span>}
          {task.repeat !== "none" && <span className="task__chip"><span aria-hidden="true">↻ </span>{t(REPEAT_KEY[task.repeat])}</span>}
          {task.subtasks.length > 0 && <span className="task__chip">{t("subtaskCount", { done: subDone, total: task.subtasks.length })}</span>}
          {showProject && project && <span className="task__chip" data-list={project.color}><span className="dot" aria-hidden="true" />{project.name}</span>}
          {task.notes && <span className="task__chip task__notes">{task.notes}</span>}
        </p>
      </div>
      {task.priority !== "none" && <span className="task__flag" aria-hidden="true">{task.priority === "high" ? "!!!" : task.priority === "medium" ? "!!" : "!"}</span>}
    </li>
  );
}

export function TaskList({ tasks, label, showProject = true }: { tasks: Task[]; label: string; showProject?: boolean }) {
  const onKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("task__title") && !target.classList.contains("check__input")) return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>(".task__title")];
    const i = rows.findIndex((b) => b.closest(".task") === target.closest(".task"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      rows[Math.min(rows.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
    } else if (e.key === "x" && !e.ctrlKey && !e.metaKey) {
      const box = target.closest<HTMLElement>(".task")?.querySelector<HTMLInputElement>(".check__input");
      if (box && !box.disabled) { e.preventDefault(); box.click(); (rows[i + 1] ?? rows[i - 1])?.focus(); }
    } else if (e.key === "e" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      rows[i]?.click();
    }
  };
  return <ul className="task-list" aria-label={label} onKeyDown={onKey}>{tasks.map((t) => <TaskItem key={t.id} task={t} showProject={showProject} />)}</ul>;
}
