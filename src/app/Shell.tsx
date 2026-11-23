import { Button, Dialog, Field, IconButton, RadioGroup, Sheet, Stack, TextInput, Kbd, useToast } from "@kaykesiquara/prumo";
import { IconFocus, IconHabits, IconInbox, IconInsights, IconMenu, IconPlus, IconSearchSmall, IconSettings, IconToday, IconUpcoming } from "../components/Icons";
import { composer } from "./composer";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { CommandPalette } from "../components/CommandPalette";
import { TaskSheet } from "../components/TaskSheet";
import { advance, formatClock, isFinished, remaining } from "../domain/timer";
import type { ProjectColor } from "../domain/types";
import { useI18n, type Key } from "../i18n";
import { open as openTasks, today as todaySel } from "../store/selectors";
import { useApp, useNow, useSelect, useToday } from "./context";

const COLORS: [ProjectColor, Key][] = [["blue", "cBlue"], ["green", "cGreen"], ["orange", "cOrange"], ["red", "cRed"], ["neutral", "cNeutral"]];
const PHASE: Record<string, Key> = { focus: "timerFocus", short: "timerShort", long: "timerLong" };

function useTimerRunner() {
  const store = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const timer = useSelect((s) => s.timer);
  const now = useNow(timer.running, 500);
  const today = useToday();
  useEffect(() => {
    if (!isFinished(timer, now)) return;
    const s = store.get();
    if (timer.phase === "focus") store.dispatch({ type: "session/add", session: { taskId: timer.taskId, day: today, minutes: s.settings.focus, endedAt: new Date(timer.endsAt ?? now).toISOString() } });
    store.dispatch({ type: "timer/set", timer: advance(timer, s.settings) });
    toast(t(timer.phase === "focus" ? "sessionDone" : "breakDone"), { tone: "success", duration: 8000 });
  }, [timer, now, store, t, toast, today]);
  const base = useRef(document.title);
  useEffect(() => {
    if (timer.running) document.title = `${formatClock(remaining(timer, now))} · ${t(PHASE[timer.phase])}`;
    else document.title = base.current;
  }, [timer, now, t]);
  return { setBaseTitle: (title: string) => { base.current = title; if (!timer.running) document.title = title; } };
}

function NewProject({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const store = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>("blue");
  const [error, setError] = useState(false);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) { setError(true); return; }
    store.dispatch({ type: "project/add", project: { name, color } });
    const created = store.get().projects.at(-1)!;
    toast(t("projectCreated", { name: created.name }), { tone: "success" });
    onOpenChange(false); setName(""); setError(false);
    navigate(`/projects/${created.id}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("newProject")} closeLabel={t("close")} footer={<Button variant="primary" onClick={() => submit()}>{t("createProject")}</Button>}>
      <form onSubmit={submit}>
        <Stack gap={4}>
          <Field label={t("projectName")} error={error ? t("nameRequired") : undefined}><TextInput value={name} onChange={(e) => { setName(e.target.value); setError(false); }} autoFocus /></Field>
          <RadioGroup legend={t("color")} name="color" value={color} onValueChange={(v) => setColor(v as ProjectColor)} orientation="horizontal"
            options={COLORS.map(([value, key]) => ({ value, label: <span className="swatch-label"><span className="dot" data-color={value} aria-hidden="true" />{t(key)}</span> }))} />
        </Stack>
      </form>
    </Dialog>
  );
}

function Shortcuts({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const rows: [string[], Key][] = [[["N"], "kNew"], [["Ctrl", "K"], "kSearch"], [["/"], "kSearch"], [["G", "T · U · I · F · H"], "kGo"], [["↑", "↓"], "kList"], [["X"], "kComplete"], [["E"], "kOpen"], [["?"], "kHelp"]];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("shortcuts")} description={t("shortcutsHint")} closeLabel={t("close")}>
      <table className="keys-table">
        <caption className="pr-visually-hidden">{t("shortcuts")}</caption>
        <tbody>{rows.map(([keys, k], i) => <tr key={i}><th scope="row">{keys.map((x) => <Kbd key={x}>{x}</Kbd>)}</th><td>{t(k)}</td></tr>)}</tbody>
      </table>
    </Dialog>
  );
}

function Nav({ onNavigate, onNewProject }: { onNavigate?: () => void; onNewProject: () => void }) {
  const { t } = useI18n();
  const day = useToday();
  const counts = useSelect((s) => {
    const td = todaySel(s, day);
    const open = openTasks(s);
    return { today: td.today.length + td.overdue.length, inbox: open.filter((x) => x.projectId === null).length, projects: Object.fromEntries(s.projects.map((p) => [p.id, open.filter((x) => x.projectId === p.id).length])) };
  });
  const projects = useSelect((s) => s.projects.filter((p) => !p.archived));
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "nav__link is-active" : "nav__link");
  const item = (to: string, key: Key, count?: number) => {
    const Icon = ICONS[key];
    return (
      <li data-list={key}><NavLink to={to} className={link} onClick={onNavigate}><span className="nav__icon">{Icon && <Icon />}</span><span className="nav__label">{t(key)}</span>{count ? <span className="nav__count" aria-label={t("tasksCount", { n: count })}>{count}</span> : null}</NavLink></li>
    );
  };
  return (
    <nav aria-label={t("mainNav")} className="nav">
      <ul>{item("/today", "today", counts.today)}{item("/upcoming", "upcoming")}{item("/inbox", "inbox", counts.inbox)}</ul>
      <div className="nav__head"><p className="nav__group" id="nav-projects">{t("projects")}</p><IconButton label={t("newProject")} size="sm" onClick={onNewProject}><span aria-hidden="true">+</span></IconButton></div>
      <ul aria-labelledby="nav-projects">
        {projects.map((p) => (
          <li key={p.id} data-list={p.color}><NavLink to={`/projects/${p.id}`} className={link} onClick={onNavigate}><span className="nav__icon"><span className="dot" aria-hidden="true" /></span><span className="nav__label">{p.name}</span>{counts.projects[p.id] ? <span className="nav__count" aria-label={t("tasksCount", { n: counts.projects[p.id] })}>{counts.projects[p.id]}</span> : null}</NavLink></li>
        ))}
      </ul>
      <ul className="nav__tools">{item("/focus", "focus")}{item("/habits", "habits")}{item("/insights", "insights")}{item("/settings", "settings")}</ul>
    </nav>
  );
}

const ICONS: Partial<Record<Key, (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element>> = { today: IconToday, upcoming: IconUpcoming, inbox: IconInbox, focus: IconFocus, habits: IconHabits, insights: IconInsights, settings: IconSettings };

function TabBar({ onMenu }: { onMenu: () => void }) {
  const { t } = useI18n();
  const tabs: [string, Key][] = [["/today", "today"], ["/upcoming", "upcoming"], ["/focus", "focus"], ["/habits", "habits"]];
  return (
    <nav className="tabbar" aria-label={t("tabNav")}>
      <ul>
        {tabs.map(([to, key]) => {
          const Icon = ICONS[key]!;
          return <li key={to} data-list={key}><NavLink to={to} className={({ isActive }) => (isActive ? "tab is-active" : "tab")}><Icon className="tab__icon" /><span>{t(key)}</span></NavLink></li>;
        })}
        <li><button type="button" className="tab" onClick={onMenu}><IconMenu className="tab__icon" /><span>{t("menu")}</span></button></li>
      </ul>
    </nav>
  );
}

const GO: Record<string, string> = { t: "/today", u: "/upcoming", i: "/inbox", f: "/focus", h: "/habits", r: "/insights", s: "/settings" };
const typing = (el: Element | null) => !!el && (el.matches("input, textarea, select, [contenteditable=true]") || !!el.closest("[role=dialog]"));

function Credits() {
  const { t, lang } = useI18n();
  return (
    <p className="credits">
      {t("madeBy")} <a href={lang === "pt" ? "https://kayke-siquara.vercel.app" : "https://kayke-siquara-en.vercel.app"}>Kayke Siquara</a>
      <br /><a href="https://github.com/KaykeSiquara/ritmo">{t("sourceCode")}</a>
    </p>
  );
}

export function Shell() {
  const { t, lang } = useI18n();
  const store = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSelect((s) => s.settings);
  const [navOpen, setNavOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [keys, setKeys] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const { setBaseTitle } = useTimerRunner();
  const first = useRef(true);
  const pendingG = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") delete root.dataset.prTheme; else root.dataset.prTheme = settings.theme;
    if (settings.density === "compact") root.dataset.prDensity = "compact"; else delete root.dataset.prDensity;
    root.lang = lang === "pt" ? "pt-BR" : "en";
  }, [settings.theme, settings.density, lang]);

  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>("#main h1");
    setBaseTitle(`${h1?.textContent ?? "Ritmo"} · Ritmo`);
    if (first.current) { first.current = false; return; }
    setNavOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLElement>("#main h1")?.focus());
  }, [location.pathname, lang]);

  const openShortcuts = useCallback(() => setKeys(true), []);
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    const on = () => setComposerOpen(composer.isOpen());
    window.addEventListener(composer.event, on);
    return () => window.removeEventListener(composer.event, on);
  }, []);
  const openComposer = useCallback(() => {
    if (document.getElementById("quick-add")) composer.open();
    else { navigate("/today"); setTimeout(() => composer.open(), 60); }
  }, [navigate]);
  useEffect(() => { composer.close(false); }, [location.pathname]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((o) => !o); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(document.activeElement)) return;
      if (Date.now() - pendingG.current < 1200 && GO[e.key]) { e.preventDefault(); pendingG.current = 0; navigate(GO[e.key]); return; }
      if (e.key === "Escape" && composer.isOpen()) { composer.close(); return; }
      if (e.key === "g") { pendingG.current = Date.now(); return; }
      if (e.key === "/") { e.preventDefault(); setPalette(true); }
      else if (e.key === "?") { e.preventDefault(); setKeys(true); }
      else if (e.key === "n") {
        e.preventDefault();
        openComposer();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [navigate, openComposer]);

  return (
    <div className="shell">
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>{t("skip")}</a>
      <aside className="sidebar">
        <p className="brand"><span className="brand__mark" aria-hidden="true" />Ritmo</p>
        <Nav onNewProject={() => setNewProject(true)} />
        <p className="sidebar__note">{t("demoNote")}</p>
        <Credits />
      </aside>
      <Sheet title="Ritmo" description={t("appTagline")} side="left" open={navOpen} onOpenChange={setNavOpen} closeLabel={t("closeNav")}>
        <Nav onNavigate={() => setNavOpen(false)} onNewProject={() => { setNavOpen(false); setNewProject(true); }} />
        <Credits />
      </Sheet>
      <div className="content">
        <header className="topbar">
          <p className="brand topbar__brand"><span className="brand__mark" aria-hidden="true" />Ritmo</p>
          <button type="button" className="topbar__search" onClick={() => setPalette(true)} aria-label={t("search")}><IconSearchSmall /><span>{t("search")}</span><Kbd>Ctrl K</Kbd></button>
          <div className="topbar__tools">
            <Button size="sm" variant="ghost" onClick={() => setKeys(true)} aria-label={t("shortcuts")}><span aria-hidden="true">?</span></Button>
            <Button size="sm" onClick={() => store.dispatch({ type: "settings/update", patch: { lang: lang === "pt" ? "en" : "pt" } })} aria-label={t("langLabel")} lang={lang === "pt" ? "en" : "pt-BR"}>{t("langButton")}</Button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="main"><Outlet /></main>
      </div>
      <TabBar onMenu={() => setNavOpen(true)} />
      <button type="button" className="fab" aria-label={composerOpen ? t("closeComposer") : t("quickAdd")} aria-expanded={composerOpen} aria-controls="composer" onClick={() => (composer.isOpen() ? composer.close() : openComposer())}><IconPlus /></button>
      <TaskSheet />
      <CommandPalette open={palette} onOpenChange={setPalette} onShortcuts={openShortcuts} />
      <Shortcuts open={keys} onOpenChange={setKeys} />
      <NewProject open={newProject} onOpenChange={setNewProject} />
    </div>
  );
}
