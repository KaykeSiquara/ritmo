import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, IconX, Select, Stack, Stat, TextInput, useToast } from "@kaykesiquara/prumo";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { useApp, useNow, useSelect, useToday } from "../app/context";
import { heatmap, isScheduled, rate, streaks } from "../domain/habits";
import { advance, durationMs, formatClock, pause, remaining, reset, start } from "../domain/timer";
import type { Habit } from "../domain/types";
import { useI18n, type Key } from "../i18n";
import { insights, open as openTasks } from "../store/selectors";
import { seed } from "../store/seed";
import { validate, type State } from "../store/state";
import { IconFocus, IconHabits, IconInsights, IconSettings } from "../components/Icons";
import { Header } from "./Lists";

const PHASE: Record<string, Key> = { focus: "timerFocus", short: "timerShort", long: "timerLong" };

export function FocusView() {
  const { t } = useI18n();
  const store = useApp();
  const day = useToday();
  const timer = useSelect((s) => s.timer);
  const settings = useSelect((s) => s.settings);
  const tasks = useSelect((s) => openTasks(s));
  const sessions = useSelect((s) => s.sessions.filter((x) => x.day === day));
  const allTasks = useSelect((s) => s.tasks);
  const now = useNow(timer.running, 250);
  const rem = remaining(timer, now);
  const total = durationMs(timer.phase, settings);
  const progress = Math.min(1, Math.max(0, 1 - rem / total));
  const set = (next: typeof timer) => store.dispatch({ type: "timer/set", timer: next });
  const R = 118, C = 2 * Math.PI * R;
  const minutes = sessions.reduce((a, x) => a + x.minutes, 0);
  return (
    <>
      <Header title={t("focus")} icon={<IconFocus />} list="focus" />
      <div className="focus">
        <section className="focus__card" aria-label={t(PHASE[timer.phase])}>
          <div className="focus__inner">
            <Badge tone={timer.phase === "focus" ? "accent" : "success"}>{t(PHASE[timer.phase])}</Badge>
            <div className="focus__ring">
              <svg viewBox="0 0 260 260" aria-hidden="true">
                <circle cx="130" cy="130" r={R} className="focus__track" />
                <circle cx="130" cy="130" r={R} className="focus__progress" data-phase={timer.phase} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
              </svg>
              <p role="timer" aria-label={t(PHASE[timer.phase])} className="focus__clock">{formatClock(rem)}</p>
            </div>
            <p className="muted">{t("cycleOf", { n: (timer.cycle % settings.longEvery) + 1, total: settings.longEvery })}</p>
            <Stack direction="row" gap={2} justify="center" wrap>
              {timer.running
                ? <Button variant="primary" size="lg" onClick={() => set(pause(timer, Date.now()))}>{t("pause")}</Button>
                : <Button variant="primary" size="lg" onClick={() => set(start(timer, Date.now()))}>{rem < total ? t("resume") : t("start")}</Button>}
              <Button size="lg" onClick={() => set(reset(timer, settings))} disabled={rem === total && !timer.running}>{t("reset")}</Button>
              <Button size="lg" variant="ghost" onClick={() => set(advance(timer, settings))}>{t("skipPhase")}</Button>
            </Stack>
            <Field label={t("focusingOn")} className="focus__task">
              <Select value={timer.taskId ?? ""} onChange={(e) => set({ ...timer, taskId: e.target.value || null })}>
                <option value="">{t("pickTask")}</option>
                {tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </Select>
            </Field>
          </div>
        </section>
        <section className="focus__today" aria-labelledby="today-focus-h">
          <h2 id="today-focus-h" className="h2">{t("sessionsToday")}</h2>
          <Stat label={t("focusMinutes")} value={t("minutes", { n: minutes })} delta={t("sessionsN", { n: sessions.length })} />
          {sessions.length > 0 && (
            <ul className="sessions">
              {sessions.slice().reverse().map((x) => <li key={x.id}><span>{allTasks.find((tk) => tk.id === x.taskId)?.title ?? t("pickTask")}</span><span className="muted">{new Date(x.endedAt).toTimeString().slice(0, 5)} · {t("minutes", { n: x.minutes })}</span></li>)}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function HabitGrid({ habit, today, weekStart }: { habit: Habit; today: string; weekStart: 0 | 1 }) {
  const { t, shortDate, weekdayShort } = useI18n();
  const store = useApp();
  const grid = heatmap(habit, today, 12, weekStart);
  const todayPos = (() => { for (let w = 0; w < grid.length; w++) for (let d = 0; d < 7; d++) if (grid[w][d].day === today) return [w, d] as const; return [11, 0] as const; })();
  const [pos, setPos] = useState<readonly [number, number]>(todayPos);
  const ref = useRef<HTMLTableElement>(null);
  const focusCell = (w: number, d: number) => { setPos([w, d]); ref.current?.querySelector<HTMLButtonElement>(`[data-cell="${w}-${d}"]`)?.focus(); };
  const onKey = (e: KeyboardEvent<HTMLTableElement>) => {
    const [w, d] = pos;
    const moves: Record<string, [number, number]> = { ArrowRight: [w + 1, d], ArrowLeft: [w - 1, d], ArrowDown: [w, d + 1], ArrowUp: [w, d - 1], Home: [0, d], End: [grid.length - 1, d] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    focusCell(Math.min(grid.length - 1, Math.max(0, m[0])), Math.min(6, Math.max(0, m[1])));
  };
  return (
    <table className="heat" role="grid" aria-label={`${habit.name}, ${t("last12")}`} ref={ref} onKeyDown={onKey}>
      <tbody>
        {Array.from({ length: 7 }, (_, d) => (
          <tr key={d}>
            <th scope="row" className="heat__day">{weekdayShort(grid[0][d].day).slice(0, 3)}</th>
            {grid.map((week, w) => {
              const c = week[d];
              const off = c.future || !c.scheduled || c.day < habit.createdAt;
              const state = !c.scheduled ? t("offDay") : c.done ? t("doneState") : t("notDone");
              return (
                <td key={c.day} role="gridcell" aria-selected={pos[0] === w && pos[1] === d}>
                  <button type="button" data-cell={`${w}-${d}`} className="heat__cell" data-done={c.done || undefined} data-off={off || undefined} data-today={c.day === today || undefined}
                    tabIndex={pos[0] === w && pos[1] === d ? 0 : -1} aria-pressed={c.scheduled ? c.done : undefined} aria-disabled={off || undefined}
                    aria-label={t("habitCell", { name: habit.name, date: shortDate(c.day), state })}
                    onClick={() => { setPos([w, d]); if (!off) store.dispatch({ type: "habit/toggle", id: habit.id, day: c.day }); }} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HabitsView() {
  const { t, number } = useI18n();
  const store = useApp();
  const toast = useToast();
  const day = useToday();
  const habits = useSelect((s) => s.habits);
  const weekStart = useSelect((s) => s.settings.weekStart);
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<Habit["schedule"]>("daily");
  const [err, setErr] = useState(false);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr(true); return; }
    store.dispatch({ type: "habit/add", habit: { name, schedule }, today: day });
    toast(t("habitAdded", { name: name.trim() }), { tone: "success" });
    setName(""); setErr(false);
  };
  const pct = (v: number) => new Intl.NumberFormat(undefined, { style: "percent" }).format(v);
  return (
    <>
      <Header title={t("habits")} icon={<IconHabits />} list="habits" />
      <form className="habit-form" onSubmit={add}>
        <Field label={t("habitName")} error={err ? t("nameRequired") : undefined}><TextInput value={name} onChange={(e) => { setName(e.target.value); setErr(false); }} /></Field>
        <Field label={t("schedule")}><Select value={schedule} onChange={(e) => setSchedule(e.target.value as Habit["schedule"])}><option value="daily">{t("sDaily")}</option><option value="weekdays">{t("sWeekdays")}</option></Select></Field>
        <Button type="submit" variant="primary">{t("addHabit")}</Button>
      </form>
      {!habits.length && <EmptyState title={t("habitsEmpty")} />}
      <ul className="habits">
        {habits.map((h) => {
          const st = streaks(h, day);
          const scheduledToday = isScheduled(day, h.schedule);
          return (
            <li key={h.id}>
              <div className="habit">
                <div className="habit__side">
                  <div className="habit__head">
                    <h2 className="habit__name">{h.name}</h2>
                    <IconButton size="sm" label={`${t("deleteHabit")}: ${h.name}`} onClick={() => { store.dispatch({ type: "habit/delete", id: h.id }); toast(t("habitDeleted", { name: h.name }), { action: { label: t("undo"), onClick: () => store.undo() } }); }}><IconX /></IconButton>
                  </div>
                  <Badge>{t(h.schedule === "daily" ? "sDaily" : "sWeekdays")}</Badge>
                  <button type="button" className="habit__today" aria-pressed={st.doneToday} disabled={!scheduledToday} onClick={() => store.dispatch({ type: "habit/toggle", id: h.id, day })}>
                    <span className="habit__today-dot" aria-hidden="true">{st.doneToday ? "✓" : ""}</span>{t("markDone", { name: h.name })}
                  </button>
                  <dl className="habit__stats">
                    <div><dt>{t("streak")}</dt><dd><IconHabits className="habit__flame" />{t("daysN", { n: number(st.current) })}</dd></div>
                    <div><dt>{t("best")}</dt><dd>{t("daysN", { n: number(st.best) })}</dd></div>
                  </dl>
                  <p className="muted">{t("rate", { pct: pct(rate(h, day, 30)) })}</p>
                </div>
                <div className="habit__grid"><p className="muted habit__grid-label">{t("last12")}</p><HabitGrid habit={h} today={day} weekStart={weekStart} /></div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Bars({ title, data, format, kind }: { title: string; data: { day: string; value: number }[]; format: (n: number) => string; kind?: "focus" }) {
  const { t, weekdayShort, shortDate } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 560, H = 160, gap = 6, bw = (W - gap * (data.length - 1)) / data.length;
  return (
    <figure className="bars">
      <figcaption className="bars__title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 22}`} aria-hidden="true" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = Math.max(d.value ? 3 : 0, (d.value / max) * H);
          return (
            <g key={d.day}>
              <rect x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={5} className="bars__bar" data-kind={kind} />
              {i % 2 === data.length % 2 ? null : <text x={i * (bw + gap) + bw / 2} y={H + 16} textAnchor="middle" className="bars__label">{weekdayShort(d.day).slice(0, 3)}</text>}
            </g>
          );
        })}
      </svg>
      <p className="pr-visually-hidden">{t("chartSummary")}</p>
      <table className="pr-visually-hidden"><caption>{title}</caption><thead><tr><th scope="col">{t("day")}</th><th scope="col">{title}</th></tr></thead><tbody>{data.map((d) => <tr key={d.day}><th scope="row">{shortDate(d.day)}</th><td>{format(d.value)}</td></tr>)}</tbody></table>
    </figure>
  );
}

export function InsightsView() {
  const { t, number } = useI18n();
  const day = useToday();
  const i = useSelect((s) => insights(s, day));
  return (
    <>
      <Header title={t("insights")} subtitle={t("last14")} icon={<IconInsights />} list="insights" />
      <div className="stats">
        <Stat label={t("completedTasks")} value={number(i.completed)} delta={i.overdue ? t("overdueNow", { n: i.overdue }) : undefined} />
        <Stat label={t("focusMinutes")} value={number(i.focus)} />
        <Stat label={t("activeDays")} value={number(i.activeDays)} delta={t("ofN", { n: 14 })} />
        <Stat label={t("dayStreak")} value={number(i.streak)} />
      </div>
      <div className="charts">
        <Bars title={t("completedPerDay")} data={i.series.map((x) => ({ day: x.day, value: x.completed }))} format={number} />
        <Bars title={t("focusPerDay")} data={i.series.map((x) => ({ day: x.day, value: x.focus }))} format={(n) => t("minutes", { n })} kind="focus" />
      </div>
    </>
  );
}

export function SettingsView() {
  const { t } = useI18n();
  const store = useApp();
  const toast = useToast();
  const day = useToday();
  const settings = useSelect((s) => s.settings);
  const [pending, setPending] = useState<State | null>(null);
  const [resetting, setResetting] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof settings>) => {
    store.dispatch({ type: "settings/update", patch });
    const s = store.get();
    if (!s.timer.running && ("focus" in patch || "short" in patch || "long" in patch)) store.dispatch({ type: "timer/set", timer: reset(s.timer, s.settings) });
  };
  const minutes = (key: "focus" | "short" | "long" | "longEvery", label: Key, max: number) => (
    <Field label={t(label)}><TextInput type="number" min={1} max={max} value={settings[key]} onChange={(e) => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= max) set({ [key]: v }); }} /></Field>
  );
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, data: store.get() }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `ritmo-${day}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    toast(t("exported"), { tone: "success" });
  };
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const state = validate(json?.data ?? json);
      if (!state) throw new Error("invalid");
      setPending(state);
    } catch { toast(t("importInvalid"), { tone: "danger" }); }
    if (file.current) file.current.value = "";
  };
  return (
    <>
      <Header title={t("settings")} icon={<IconSettings />} list="settings" />
      <div className="settings">
        <section className="settings__section" aria-labelledby="set-lang"><h2 id="set-lang" className="h2">{t("language")}</h2>
          <div className="grid-2">
            <Field label={t("language")}><Select value={settings.lang} onChange={(e) => set({ lang: e.target.value as "pt" | "en" })}><option value="pt">Português</option><option value="en">English</option></Select></Field>
            <Field label={t("theme")}><Select value={settings.theme} onChange={(e) => set({ theme: e.target.value as typeof settings.theme })}><option value="light">{t("light")}</option><option value="dark">{t("dark")}</option><option value="system">{t("system")}</option></Select></Field>
            <Field label={t("density")}><Select value={settings.density} onChange={(e) => set({ density: e.target.value as typeof settings.density })}><option value="comfortable">{t("comfortable")}</option><option value="compact">{t("compact")}</option></Select></Field>
            <Field label={t("weekStart")}><Select value={settings.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) as 0 | 1 })}><option value={1}>{t("monday")}</option><option value={0}>{t("sunday")}</option></Select></Field>
          </div>
        </section>
        <section className="settings__section" aria-labelledby="set-timer"><h2 id="set-timer" className="h2">{t("timerSettings")}</h2>
          <div className="grid-2">{minutes("focus", "focusLength", 120)}{minutes("short", "shortLength", 60)}{minutes("long", "longLength", 90)}{minutes("longEvery", "longEvery", 12)}</div>
        </section>
        <section className="settings__section" aria-labelledby="set-data"><h2 id="set-data" className="h2">{t("data")}</h2>
          <Stack gap={4}>
            <p className="muted" style={{ margin: 0 }}>{t("dataBody")}</p>
            <Stack direction="row" gap={2} wrap>
              <Button onClick={exportData}>{t("exportData")}</Button>
              <Button onClick={() => file.current?.click()}>{t("importData")}</Button>
              <Button variant="danger" onClick={() => setResetting(true)}>{t("resetDemo")}</Button>
            </Stack>
            <input ref={file} type="file" accept="application/json,.json" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => readFile(e.target.files?.[0])} />
          </Stack>
        </section>
      </div>
      <ConfirmDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} title={t("importTitle")} description={pending ? t("importBody", { tasks: pending.tasks.length, projects: pending.projects.length, habits: pending.habits.length }) : ""}
        confirmLabel={t("importConfirm")} cancelLabel={t("cancel")} closeLabel={t("close")} tone="danger" onConfirm={() => { if (pending) store.dispatch({ type: "data/replace", state: pending }); setPending(null); toast(t("imported"), { tone: "success" }); }} />
      <ConfirmDialog open={resetting} onOpenChange={setResetting} title={t("resetTitle")} description={t("resetBody")} confirmLabel={t("resetDemo")} cancelLabel={t("cancel")} closeLabel={t("close")} tone="danger"
        onConfirm={() => { const s = store.get(); store.dispatch({ type: "data/replace", state: { ...seed(s.settings.lang, day), settings: s.settings } }); setResetting(false); toast(t("resetDone"), { tone: "success" }); }} />
    </>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <Header title={t("notFound")} />
      <EmptyState title={t("notFoundBody")} action={<Link to="/today" className="pr-button" data-variant="primary" data-size="md">{t("backToday")}</Link>} />
    </>
  );
}

