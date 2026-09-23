import { Button, ConfirmDialog, EmptyState, IconChevronDown, Menu, MenuItem, MenuLabel, MenuSeparator, Tab, TabList, TabPanel, Tabs, useToast } from "@kaykesiquara/prumo";
import { useState, type DragEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useApp, useSelect } from "../app/context";
import { QuickAdd } from "../components/QuickAdd";
import { TaskList } from "../components/TaskItem";
import type { Status, Task } from "../domain/types";
import { useI18n, type Key } from "../i18n";
import { board, byUrgency } from "../store/selectors";
import { IconProject } from "../components/Icons";
import { Header } from "./Lists";
import { NotFound } from "./Other";

const COLUMNS: [Status, Key][] = [["todo", "sTodo"], ["doing", "sDoing"], ["done", "sDone"]];

function Card({ task, onMove, column }: { task: Task; onMove: (status: Status) => void; column: Status }) {
  const { t } = useI18n();
  const [, setParams] = useSearchParams();
  return (
    <li className="card" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; e.currentTarget.dataset.dragging = "true"; }}
      onDragEnd={(e) => delete e.currentTarget.dataset.dragging} data-task-id={task.id} data-priority={task.priority}>
      <div className="card__top">
        <button type="button" className="card__title" onClick={() => setParams({ task: task.id })}>{task.title}</button>
        {task.priority !== "none" && <span className="task__flag"><span aria-hidden="true">{task.priority === "high" ? "!!!" : task.priority === "medium" ? "!!" : "!"}</span><span className="pr-visually-hidden">{t(task.priority === "high" ? "pHigh" : task.priority === "medium" ? "pMedium" : "pLow")}</span></span>}
      </div>
      <div className="card__foot">
        {task.subtasks.length > 0 && <span className="task__chip">{t("subtaskCount", { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length })}</span>}
        <Menu label={t("cardActions", { title: task.title })} align="end" trigger={<Button size="sm" variant="ghost" aria-label={t("cardActions", { title: task.title })} iconEnd={<IconChevronDown />}>{t("moveTo")}</Button>}>
          <MenuLabel>{t("moveTo")}</MenuLabel>
          {COLUMNS.filter(([s]) => s !== column).map(([s, k]) => <MenuItem key={s} onSelect={() => onMove(s)}>{t(k)}</MenuItem>)}
        </Menu>
      </div>
    </li>
  );
}

function Board({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const store = useApp();
  const toast = useToast();
  const cols = useSelect((s) => board(s, projectId));
  const [over, setOver] = useState<Status | null>(null);
  const move = (task: Task, status: Status, before: string | null = null) => {
    store.dispatch({ type: "task/move", id: task.id, status, before, now: new Date() });
    const label = t(COLUMNS.find(([s]) => s === status)![1]);
    toast(t("movedTo", { title: task.title, column: label }), { action: { label: t("undo"), onClick: () => store.undo() } });
  };
  const drop = (status: Status) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const task = store.get().tasks.find((x) => x.id === id);
    if (!task) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>(".card");
    const before = card && card.dataset.taskId !== id ? card.dataset.taskId ?? null : null;
    if (task.status === status && !before) return;
    move(task, status, before);
  };
  return (
    <div className="board">
      {COLUMNS.map(([status, key]) => (
        <section key={status} aria-labelledby={`col-${status}`} className="column" data-over={over === status || undefined}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(status); }} onDragLeave={() => setOver(null)} onDrop={drop(status)}>
          <h2 id={`col-${status}`} className="column__head">{t(key)} <span className="column__count">{cols[status].length}</span></h2>
          {cols[status].length ? (
            <ul className="column__list" aria-labelledby={`col-${status}`}>{cols[status].map((task) => <Card key={task.id} task={task} column={status} onMove={(s) => move(task, s)} />)}</ul>
          ) : <p className="column__empty">{t("columnEmpty")}</p>}
        </section>
      ))}
    </div>
  );
}

export function ProjectView() {
  const { id = "" } = useParams();
  const { t } = useI18n();
  const store = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const project = useSelect((s) => s.projects.find((p) => p.id === id));
  const tasks = useSelect((s) => s.tasks.filter((x) => x.projectId === id));
  const [confirm, setConfirm] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem(`ritmo:view:${id}`) ?? "list");
  if (!project) return <NotFound />;
  const open = tasks.filter((x) => x.status !== "done").sort(byUrgency);
  const setAndSave = (v: string) => { setView(v); try { localStorage.setItem(`ritmo:view:${id}`, v); } catch { return; } };
  return (
    <>
      <Header title={project.name} subtitle={t("tasksCount", { n: open.length })} list={project.color} icon={<IconProject />}
        actions={<Menu label={project.name} align="end" trigger={<Button size="sm" iconEnd={<IconChevronDown />}>{t("edit")}</Button>}>
          <MenuItem tone="danger" onSelect={() => setConfirm(true)}>{t("deleteProject")}</MenuItem>
          <MenuSeparator />
          <MenuLabel>{project.name}</MenuLabel>
        </Menu>} />
      <QuickAdd defaults={{ projectId: project.id }} />
      <Tabs label={t("views")} value={view} onValueChange={setAndSave}>
        <TabList label={t("views")}><Tab value="list">{t("list")}</Tab><Tab value="board">{t("board")}</Tab></TabList>
        <TabPanel value="list">{open.length ? <TaskList tasks={open} label={project.name} showProject={false} /> : <EmptyState title={t("nothingDay")} />}</TabPanel>
        <TabPanel value="board"><Board projectId={project.id} /></TabPanel>
      </Tabs>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={t("deleteProjectTitle", { name: project.name })} description={t("deleteProjectBody")} confirmLabel={t("deleteProject")} cancelLabel={t("cancel")} closeLabel={t("close")} tone="danger"
        onConfirm={() => { const name = project.name; setConfirm(false); store.dispatch({ type: "project/delete", id: project.id }); navigate("/inbox"); toast(t("projectDeleted", { name }), { action: { label: t("undo"), onClick: () => { store.undo(); navigate(`/projects/${id}`); } } }); }} />
    </>
  );
}
