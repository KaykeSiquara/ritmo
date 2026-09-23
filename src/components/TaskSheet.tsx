import { Button, Checkbox, Field, IconButton, IconX, Select, Sheet, Stack, TextArea, TextInput, useToast } from "@kaykesiquara/prumo";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useApp, useSelect } from "../app/context";
import type { Priority, Repeat, Status, Task } from "../domain/types";
import { useI18n } from "../i18n";

export function TaskSheet() {
  const [params, setParams] = useSearchParams();
  const id = params.get("task");
  const store = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const task = useSelect((s) => s.tasks.find((x) => x.id === id));
  const projects = useSelect((s) => s.projects.filter((p) => !p.archived));
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  useEffect(() => { if (task) setTitle(task.title); }, [task?.id]);
  const close = () => setParams((p) => { const n = new URLSearchParams(p); n.delete("task"); return n; });
  if (!id) return null;
  const update = (patch: Partial<Task>) => task && store.dispatch({ type: "task/update", id: task.id, patch });
  const addSub = (e: FormEvent) => { e.preventDefault(); if (task) store.dispatch({ type: "subtask/add", taskId: task.id, title: sub }); setSub(""); };
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && close()} title={task?.title || t("taskDetails")} description={t("taskDetails")} closeLabel={t("close")}>
      {task && (
        <Stack gap={5}>
          <Field label={t("title")} error={title.trim() ? undefined : t("titleRequired")}>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title.trim() !== task.title && update({ title: title.trim() })} />
          </Field>
          <div className="grid-2">
            <Field label={t("dueDate")}><TextInput type="date" value={task.due ?? ""} onChange={(e) => update({ due: e.target.value || null })} /></Field>
            <Field label={t("time")}><TextInput type="time" value={task.time ?? ""} onChange={(e) => update({ time: e.target.value || null })} /></Field>
            <Field label={t("priority")}>
              <Select value={task.priority} onChange={(e) => update({ priority: e.target.value as Priority })}>
                <option value="high">{t("high")}</option><option value="medium">{t("medium")}</option><option value="low">{t("low")}</option><option value="none">{t("none")}</option>
              </Select>
            </Field>
            <Field label={t("repeat")}>
              <Select value={task.repeat} onChange={(e) => update({ repeat: e.target.value as Repeat })}>
                <option value="none">{t("rNone")}</option><option value="daily">{t("rDaily")}</option><option value="weekdays">{t("rWeekdays")}</option><option value="weekly">{t("rWeekly")}</option><option value="monthly">{t("rMonthly")}</option>
              </Select>
            </Field>
            <Field label={t("project")}>
              <Select value={task.projectId ?? ""} onChange={(e) => update({ projectId: e.target.value || null })}>
                <option value="">{t("noProject")}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={t("status")}>
              <Select value={task.status} onChange={(e) => store.dispatch({ type: "task/move", id: task.id, status: e.target.value as Status, now: new Date() })}>
                <option value="todo">{t("sTodo")}</option><option value="doing">{t("sDoing")}</option><option value="done">{t("sDone")}</option>
              </Select>
            </Field>
          </div>
          <Field label={t("notes")}><TextArea value={task.notes} onChange={(e) => update({ notes: e.target.value })} /></Field>
          <section aria-labelledby="subtasks-title" className="subtasks">
            <h3 id="subtasks-title" className="h3">{t("subtasks")}</h3>
            <ul className="subtasks__list">
              {task.subtasks.map((s) => (
                <li key={s.id} className="subtasks__item">
                  <Checkbox label={s.title} checked={s.done} onChange={() => store.dispatch({ type: "subtask/toggle", taskId: task.id, id: s.id })} />
                  <IconButton label={t("removeSubtask", { title: s.title })} size="sm" onClick={() => store.dispatch({ type: "subtask/delete", taskId: task.id, id: s.id })}><IconX /></IconButton>
                </li>
              ))}
            </ul>
            <form onSubmit={addSub} className="subtasks__add">
              <Field label={t("addSubtask")} hideLabel><TextInput value={sub} onChange={(e) => setSub(e.target.value)} placeholder={t("addSubtask")} size="sm" /></Field>
              <Button type="submit" size="sm" disabled={!sub.trim()}>{t("quickAddButton")}</Button>
            </form>
          </section>
          <Stack direction="row" gap={2} wrap>
            <Button variant="primary" onClick={() => { store.dispatch({ type: "timer/set", timer: { ...store.get().timer, taskId: task.id } }); close(); navigate("/focus"); }}>{t("focusOnThis")}</Button>
            <Button variant="danger" onClick={() => { const title = task.title; close(); store.dispatch({ type: "task/delete", id: task.id }); toast(t("deleted", { title }), { action: { label: t("undo"), onClick: () => store.undo() } }); }}>{t("deleteTask")}</Button>
          </Stack>
        </Stack>
      )}
    </Sheet>
  );
}
