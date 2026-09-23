import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconSearch } from "@kaykesiquara/prumo";
import { useNavigate } from "react-router";
import { useApp, useSelect } from "../app/context";
import { search } from "../store/selectors";
import { useI18n, type Key } from "../i18n";

type Item = { id: string; group: "pages" | "actions" | "projects" | "tasks"; label: string; hint?: string; run: () => void };
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const PAGES: [Key, string][] = [["today", "/today"], ["upcoming", "/upcoming"], ["inbox", "/inbox"], ["focus", "/focus"], ["habits", "/habits"], ["insights", "/insights"], ["settings", "/settings"]];

export function CommandPalette({ open, onOpenChange, onShortcuts }: { open: boolean; onOpenChange: (o: boolean) => void; onShortcuts: () => void }) {
  const { t } = useI18n();
  const store = useApp();
  const navigate = useNavigate();
  const projects = useSelect((s) => s.projects.filter((p) => !p.archived));
  const lang = useSelect((s) => s.settings.lang);
  const theme = useSelect((s) => s.settings.theme);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const term = fold(q.trim());

  const items = useMemo<Item[]>(() => {
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    const base: Item[] = [
      ...PAGES.map(([k, to]) => ({ id: `page-${to}`, group: "pages" as const, label: t(k), run: () => navigate(to) })),
      { id: "new", group: "actions", label: t("newTask"), run: () => { navigate("/today"); requestAnimationFrame(() => document.getElementById("quick-add")?.focus()); } },
      { id: "focus", group: "actions", label: t("startFocus"), run: () => navigate("/focus") },
      { id: "theme", group: "actions", label: t("toggleTheme"), run: () => store.dispatch({ type: "settings/update", patch: { theme: dark ? "light" : "dark" } }) },
      { id: "lang", group: "actions", label: t("switchLanguage"), run: () => store.dispatch({ type: "settings/update", patch: { lang: lang === "pt" ? "en" : "pt" } }) },
      { id: "keys", group: "actions", label: t("shortcuts"), run: onShortcuts },
      ...projects.map((p) => ({ id: `project-${p.id}`, group: "projects" as const, label: p.name, run: () => navigate(`/projects/${p.id}`) })),
    ];
    const local = term ? base.filter((i) => fold(i.label).includes(term)) : base.filter((i) => i.group !== "projects");
    const tasks = term ? search(store.get(), q).map((x) => ({ id: `task-${x.id}`, group: "tasks" as const, label: x.title, hint: x.status === "done" ? t("sDone") : undefined, run: () => navigate(`?task=${x.id}`) })) : [];
    return [...local, ...tasks];
  }, [t, navigate, projects, lang, theme, term, q, store, onShortcuts]);

  useEffect(() => setActive(0), [term]);
  useEffect(() => { if (!open) setQ(""); }, [open]);
  const current = items[Math.min(active, items.length - 1)];
  const optId = (i: Item) => `${listId}-${i.id}`;
  useEffect(() => { if (current) document.getElementById(optId(current))?.scrollIntoView?.({ block: "nearest" }); });
  const run = (i: Item) => { onOpenChange(false); i.run(); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const last = items.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, last)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Home" && items.length) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && items.length) { e.preventDefault(); setActive(last); }
    else if (e.key === "Enter" && current) { e.preventDefault(); run(current); }
  };
  const groups: Item["group"][] = ["pages", "actions", "projects", "tasks"];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pr-overlay" />
        <Dialog.Content className="palette" aria-describedby={`${listId}-hint`}>
          <Dialog.Title className="pr-visually-hidden">{t("palette")}</Dialog.Title>
          <div className="palette__field">
            <IconSearch aria-hidden="true" />
            <input role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-label={t("palette")} aria-activedescendant={current ? optId(current) : undefined}
              value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t("palettePlaceholder")} autoFocus />
          </div>
          <ul role="listbox" id={listId} aria-label={t("palette")} className="palette__list">
            {groups.map((g) => {
              const inGroup = items.filter((i) => i.group === g);
              if (!inGroup.length) return null;
              return (
                <li key={g} role="presentation">
                  <p id={`${listId}-${g}`} className="palette__group">{t(g)}</p>
                  <ul role="group" aria-labelledby={`${listId}-${g}`}>
                    {inGroup.map((i) => (
                      <li key={i.id} id={optId(i)} role="option" aria-selected={i === current} className="palette__option" onMouseMove={() => setActive(items.indexOf(i))} onClick={() => run(i)}>
                        <span>{i.label}</span>{i.hint && <span className="palette__hint">{i.hint}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {!items.length && <li role="presentation" className="palette__empty">{t("paletteEmpty", { q: q.trim() })}</li>}
          </ul>
          <p id={`${listId}-hint`} className="palette__foot">{t("paletteHint")}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
