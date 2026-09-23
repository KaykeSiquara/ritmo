import { createContext, useContext, useMemo, type ReactNode } from "react";
import { diffDays, fromDay, type Day } from "../domain/dates";
import type { Lang } from "../domain/types";
import { en, type Key } from "./en";
import { pt } from "./pt";

const DICT = { en, pt };
type Ctx = {
  lang: Lang;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  dayLabel: (day: Day, today: Day) => string;
  dueLabel: (day: Day, today: Day) => { text: string; overdue: boolean };
  longDate: (day: Day) => string;
  shortDate: (day: Day) => string;
  weekdayShort: (day: Day) => string;
  number: (n: number) => string;
  locale: string;
};
const LangContext = createContext<Ctx | null>(null);

export function makeI18n(lang: Lang): Ctx {
  const dict = DICT[lang];
  const locale = lang === "pt" ? "pt-BR" : "en";
  const t: Ctx["t"] = (key, vars) => {
    const raw = dict[key] ?? key;
    const forms = raw.split("|");
    const n = typeof vars?.n === "number" ? vars.n : Number(vars?.n);
    const text = forms.length > 1 ? forms[n === 1 ? 0 : 1] : raw;
    return Object.entries(vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text);
  };
  const fmt = (day: Day, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o).format(fromDay(day));
  const shortDate = (day: Day) => fmt(day, { weekday: "short", day: "numeric", month: "short" });
  const dayLabel = (day: Day, today: Day) => {
    const d = diffDays(day, today);
    if (d === 0) return t("today");
    if (d === 1) return t("tomorrow");
    if (d === -1) return t("yesterday");
    return shortDate(day);
  };
  return {
    lang, t, locale, dayLabel, shortDate,
    dueLabel: (day, today) => {
      const d = diffDays(day, today);
      if (d < -1) return { text: t("overdueDays", { n: -d }), overdue: true };
      return { text: dayLabel(day, today), overdue: d < 0 };
    },
    longDate: (day) => fmt(day, { weekday: "long", day: "numeric", month: "long" }),
    weekdayShort: (day) => fmt(day, { weekday: "short" }),
    number: (n) => new Intl.NumberFormat(locale).format(n),
  };
}

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => makeI18n(lang), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n needs LangProvider");
  return ctx;
}

export type { Key };
