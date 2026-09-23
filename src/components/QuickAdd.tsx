import { Badge, Button, useToast } from "@kaykesiquara/prumo";
import { useId, useMemo, useState, type FormEvent } from "react";
import { composer, isCompact } from "../app/composer";
import { useApp, useSelect, useToday } from "../app/context";
import { parseQuickAdd } from "../domain/parser";
import type { Task } from "../domain/types";
import { useI18n, type Key } from "../i18n";

const P: Record<Task["priority"], Key> = { high: "high", medium: "medium", low: "low", none: "none" };
const R: Record<Task["repeat"], Key> = { none: "rNone", daily: "rDaily", weekdays: "rWeekdays", weekly: "rWeekly", monthly: "rMonthly" };

export function QuickAdd({ defaults = {} }: { defaults?: Partial<Pick<Task, "due" | "projectId">> }) {
  const store = useApp();
  const { t, lang, dayLabel } = useI18n();
  const toast = useToast();
  const today = useToday();
  const projects = useSelect((s) => s.projects);
  const [text, setText] = useState("");
  const id = useId();
  const parsed = useMemo(() => parseQuickAdd(text, { today, lang, projects }), [text, today, lang, projects]);
  const due = parsed.due ?? defaults.due ?? null;
  const projectId = parsed.projectId ?? defaults.projectId ?? null;
  const project = projects.find((p) => p.id === projectId);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title) return;
    store.dispatch({ type: "task/add", task: { title: parsed.title, due, time: parsed.time, priority: parsed.priority, repeat: parsed.repeat, projectId }, now: new Date() });
    toast(t("added"), { tone: "success" });
    setText("");
    if (isCompact() && composer.isOpen()) composer.close();
  };
  const chips = text.trim() ? [
    due && dayLabel(due, today), parsed.time, project && `#${project.name}`, parsed.priority !== "none" && t(P[parsed.priority]), parsed.repeat !== "none" && t(R[parsed.repeat]),
  ].filter(Boolean) as string[] : [];
  return (
    <form id="composer" className="quick-add" onSubmit={submit} role="search" aria-label={t("quickAdd")} onKeyDown={(e) => { if (e.key === "Escape" && composer.isOpen()) { e.stopPropagation(); composer.close(); } }}>
      <label htmlFor="quick-add" className="pr-visually-hidden">{t("quickAdd")}</label>
      <div className="quick-add__row">
        <span className="pr-input" data-size="lg">
          <input id="quick-add" className="pr-input__control" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("quickAdd")} autoComplete="off" aria-describedby={`${id}-hint ${id}-preview`} />
        </span>
        <Button type="submit" variant="primary" size="lg" disabled={!parsed.title}>{t("quickAddButton")}</Button>
      </div>
      <p id={`${id}-preview`} className="quick-add__preview" aria-live="polite">
        {chips.map((c) => <Badge key={c} tone="info">{c}</Badge>)}
        {parsed.unknownProject && <span className="quick-add__warn"><span aria-hidden="true">◆ </span>{t("unknownProject", { name: parsed.unknownProject })}</span>}
      </p>
      <p id={`${id}-hint`} className="quick-add__hint">{t("quickAddHint")}</p>
    </form>
  );
}
