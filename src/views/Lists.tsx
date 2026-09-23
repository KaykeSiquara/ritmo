import { Button, EmptyState, IconCheck, useToast } from "@kaykesiquara/prumo";
import { useState, type ReactNode } from "react";
import { useApp, useSelect, useToday } from "../app/context";
import { IconInbox, IconToday, IconUpcoming } from "../components/Icons";
import { QuickAdd } from "../components/QuickAdd";
import { TaskList } from "../components/TaskItem";
import { useI18n } from "../i18n";
import { inbox, today as todaySel, upcoming } from "../store/selectors";

export function Header({ title, subtitle, actions, icon, list, aside }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode; list?: string; aside?: ReactNode }) {
  return (
    <header className="view-head" data-list={list}>
      {icon && <span className="view-icon">{icon}</span>}
      <div className="view-head__text"><h1 tabIndex={-1} className="h1">{title}</h1>{subtitle && <p className="view-sub">{subtitle}</p>}</div>
      {aside}
      {actions && <div className="view-actions">{actions}</div>}
    </header>
  );
}

function ProgressRing({ done, total, label }: { done: number; total: number; label: string }) {
  const R = 22, C = 2 * Math.PI * R;
  const pct = total ? done / total : 0;
  return (
    <div className="progress-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r={R} className="progress-ring__track" /><circle cx="26" cy="26" r={R} className="progress-ring__bar" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} /></svg>
      <span className="progress-ring__text" aria-hidden="true">{done}/{total}</span>
    </div>
  );
}

export function TodayView() {
  const { t, longDate } = useI18n();
  const store = useApp();
  const toast = useToast();
  const day = useToday();
  const data = useSelect((s) => todaySel(s, day));
  const [showDone, setShowDone] = useState(false);
  const remaining = data.today.length + data.overdue.length;
  const total = remaining + data.doneToday.length;
  const moveAll = () => {
    for (const task of data.overdue) store.dispatch({ type: "task/update", id: task.id, patch: { due: day } });
    toast(t("rescheduled", { n: data.overdue.length }), { tone: "success" });
  };
  return (
    <>
      <Header title={t("today")} subtitle={longDate(day)} icon={<IconToday />} list="today" aside={total > 0 ? <ProgressRing done={data.doneToday.length} total={total} label={t("todayProgress", { done: data.doneToday.length, total })} /> : undefined} />
      <QuickAdd defaults={{ due: day }} />
      {data.overdue.length > 0 && (
        <section aria-labelledby="overdue-h" className="group">
          <div className="group__head"><h2 id="overdue-h" className="h2">{t("overdue")} <span className="count-pill">{data.overdue.length}</span></h2><Button size="sm" variant="ghost" onClick={moveAll}>{t("rescheduleAll")}</Button></div>
          <TaskList tasks={data.overdue} label={t("overdue")} />
        </section>
      )}
      <section aria-labelledby="today-h" className="group">
        <div className="group__head"><h2 id="today-h" className="h2">{t("today")}</h2></div>
        {data.today.length ? <TaskList tasks={data.today} label={t("today")} /> : total > 0 && !data.overdue.length ? (
          <div className="all-done"><span className="all-done__badge" aria-hidden="true"><IconCheck /></span><p className="all-done__title">{t("allDoneTitle")}</p><p className="all-done__text">{t("allDoneBody")}</p></div>
        ) : <EmptyState title={t("nothingToday")} />}
      </section>
      {data.doneToday.length > 0 && (
        <section aria-labelledby="done-h" className="group">
          <div className="group__head">
            <h2 id="done-h" className="h2">{t("doneToday")}</h2>
            <Button size="sm" variant="ghost" aria-expanded={showDone} aria-controls="done-list" onClick={() => setShowDone(!showDone)}>{showDone ? t("hideDone") : t("showDone", { n: data.doneToday.length })}</Button>
          </div>
          <div id="done-list" hidden={!showDone}><TaskList tasks={data.doneToday} label={t("doneToday")} /></div>
        </section>
      )}
    </>
  );
}

export function UpcomingView() {
  const { t, dayLabel, longDate } = useI18n();
  const day = useToday();
  const groups = useSelect((s) => upcoming(s, day));
  return (
    <>
      <Header title={t("upcoming")} icon={<IconUpcoming />} list="upcoming" />
      <QuickAdd defaults={{ due: groups[0].day }} />
      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`d-${g.day}`} className="group">
          <div className="group__head"><h2 id={`d-${g.day}`} className="h2">{dayLabel(g.day, day)} <span className="h2__sub">{longDate(g.day)}</span></h2></div>
          {g.tasks.length ? <TaskList tasks={g.tasks} label={longDate(g.day)} /> : <p className="muted">{t("nothingDay")}</p>}
        </section>
      ))}
    </>
  );
}

export function InboxView() {
  const { t } = useI18n();
  const tasks = useSelect(inbox);
  return (
    <>
      <Header title={t("inbox")} subtitle={t("tasksCount", { n: tasks.length })} icon={<IconInbox />} list="inbox" />
      <QuickAdd />
      <section aria-labelledby="inbox-h" className="group">
        <h2 id="inbox-h" className="pr-visually-hidden">{t("inbox")}</h2>
        {tasks.length ? <TaskList tasks={tasks} label={t("inbox")} showProject={false} /> : <EmptyState title={t("inboxEmpty")} />}
      </section>
    </>
  );
}
