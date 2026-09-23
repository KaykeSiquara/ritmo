import { addDays, addMonths, fromDay, isDay, toDay, weekday, type Day } from "./dates";
import type { Lang, Priority, Repeat } from "./types";

export type ParseContext = { today: Day; lang: Lang; projects: { id: string; name: string }[] };
export type Parsed = { title: string; due: Day | null; time: string | null; priority: Priority; projectId: string | null; repeat: Repeat; unknownProject: string | null };

const fold = (s: string) => [...s].map((c) => c.normalize("NFD")[0] ?? c).join("").toLowerCase();
export const slug = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, "");

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const WEEKDAYS: Record<Lang, string[][]> = {
  pt: [["domingo", "dom"], ["segunda", "seg"], ["terca", "ter"], ["quarta", "qua"], ["quinta", "qui"], ["sexta", "sex"], ["sabado", "sab"]],
  en: [["sunday", "sun"], ["monday", "mon"], ["tuesday", "tue", "tues"], ["wednesday", "wed"], ["thursday", "thu", "thurs"], ["friday", "fri"], ["saturday", "sat"]],
};
const PRIORITY: [Priority, string[]][] = [
  ["high", ["!alta", "!high", "!urgente", "!urgent", "!1", "p1"]],
  ["medium", ["!media", "!medium", "!2", "p2"]],
  ["low", ["!baixa", "!low", "!3", "p3"]],
];
const REPEAT: Record<Lang, [Repeat, string][]> = {
  pt: [["weekdays", "(?:todo )?dias? uteis|todo dia util"], ["daily", "todos os dias|todo dia|diariamente"], ["weekly", "toda semana|todas as semanas|semanalmente"], ["monthly", "todo mes|todos os meses|mensalmente"]],
  en: [["weekdays", "every weekday|weekdays"], ["daily", "every day|daily"], ["weekly", "every week|weekly"], ["monthly", "every month|monthly"]],
};

function nextWeekday(today: Day, target: number, includeToday: boolean): Day {
  const delta = (target - weekday(today) + 7) % 7;
  return addDays(today, delta === 0 && !includeToday ? 7 : delta);
}

function nextDayOfMonth(today: Day, dom: number): Day | null {
  if (dom < 1 || dom > 31) return null;
  const t = fromDay(today);
  for (let i = 0; i < 13; i++) {
    const c = new Date(t.getFullYear(), t.getMonth() + i, dom);
    if (c.getDate() === dom && toDay(c) >= today) return toDay(c);
  }
  return null;
}

function dayMonth(today: Day, day: number, month: number): Day | null {
  const y = fromDay(today).getFullYear();
  for (const year of [y, y + 1]) {
    const c = new Date(year, month - 1, day);
    if (c.getMonth() === month - 1 && c.getDate() === day && toDay(c) >= today) return toDay(c);
  }
  return null;
}

const hhmm = (h: number, m: number) => (h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : null);

export function parseQuickAdd(input: string, ctx: ParseContext): Parsed {
  let text = input;
  let folded = fold(input);
  const out: Parsed = { title: "", due: null, time: null, priority: "none", projectId: null, repeat: "none", unknownProject: null };
  const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean) => {
    const m = re.exec(folded);
    if (!m || !fn(m)) return false;
    const start = m.index, end = m.index + m[0].length;
    text = text.slice(0, start) + " ".repeat(end - start) + text.slice(end);
    folded = folded.slice(0, start) + " ".repeat(end - start) + folded.slice(end);
    return true;
  };
  const days = WEEKDAYS[ctx.lang];
  const dayAlt = days.map((names) => names.join("|")).join("|");
  const dayIndex = (w: string) => days.findIndex((names) => names.includes(w));

  for (const [p, words] of PRIORITY) if (take(new RegExp(`${B}(?:${words.join("|")})${E}`, "u"), () => true)) { out.priority = p; break; }

  take(/(?<![\p{L}\p{N}])#([\p{L}\p{N}_-]+)/u, (m) => {
    const hit = ctx.projects.find((p) => slug(p.name) === slug(m[1]));
    if (hit) out.projectId = hit.id; else out.unknownProject = input.slice(m.index + 1, m.index + m[0].length);
    return true;
  });

  const every = ctx.lang === "pt" ? `tod[ao]s? (?:as? )?(${dayAlt})(?:-feira)?s?` : `every (${dayAlt})`;
  if (!take(new RegExp(`${B}${every}${E}`, "u"), (m) => { out.repeat = "weekly"; out.due = nextWeekday(ctx.today, dayIndex(m[1]), true); return true; })) {
    for (const [r, pattern] of REPEAT[ctx.lang]) if (take(new RegExp(`${B}(?:${pattern})${E}`, "u"), () => true)) { out.repeat = r; break; }
  }

  if (ctx.lang === "pt") {
    take(new RegExp(`${B}(?:as |a )?(\\d{1,2})h(\\d{2})?${E}`, "u"), (m) => (out.time = hhmm(Number(m[1]), Number(m[2] ?? 0))) !== null)
      || take(new RegExp(`${B}(?:as |a )?(\\d{1,2}):(\\d{2})${E}`, "u"), (m) => (out.time = hhmm(Number(m[1]), Number(m[2]))) !== null);
  } else {
    take(new RegExp(`${B}(?:at )?(\\d{1,2})(?::(\\d{2}))? ?(am|pm)${E}`, "u"), (m) => {
      const h = Number(m[1]) % 12 + (m[3] === "pm" ? 12 : 0);
      return Number(m[1]) <= 12 && (out.time = hhmm(h, Number(m[2] ?? 0))) !== null;
    }) || take(new RegExp(`${B}(?:at )?(\\d{1,2}):(\\d{2})${E}`, "u"), (m) => (out.time = hhmm(Number(m[1]), Number(m[2]))) !== null);
  }

  if (!out.due) {
    const t = ctx.today;
    const rel: [string, () => Day | null][] = ctx.lang === "pt"
      ? [["depois de amanha", () => addDays(t, 2)], ["amanha", () => addDays(t, 1)], ["hoje", () => t]]
      : [["the day after tomorrow|day after tomorrow", () => addDays(t, 2)], ["tomorrow", () => addDays(t, 1)], ["today|tonight", () => t]];
    const found =
      take(/(?<![\p{L}\p{N}])\d{4}-\d{2}-\d{2}(?![\p{L}\p{N}])/u, (m) => (out.due = isDay(m[0]) ? m[0] : null) !== null)
      || rel.some(([words, fn]) => take(new RegExp(`${B}(?:${words})${E}`, "u"), () => (out.due = fn()) !== null))
      || take(new RegExp(`${B}${ctx.lang === "pt" ? "em (\\d{1,3}) dias?" : "in (\\d{1,3}) days?"}${E}`, "u"), (m) => (out.due = addDays(t, Number(m[1]))) !== null)
      || take(new RegExp(`${B}${ctx.lang === "pt" ? "(?:(?:na |no )?(?:proxim[ao] ))?" : "(?:next |on )?"}(${dayAlt})(?:-feira)?${E}`, "u"), (m) => (out.due = nextWeekday(t, dayIndex(m[1]), false)) !== null)
      || take(/(?<![\p{L}\p{N}/])(\d{1,2})\/(\d{1,2})(?![\p{L}\p{N}/])/u, (m) => {
        const [a, b] = [Number(m[1]), Number(m[2])];
        return (out.due = ctx.lang === "pt" ? dayMonth(t, a, b) : dayMonth(t, b, a)) !== null;
      })
      || (ctx.lang === "pt" && take(new RegExp(`${B}dia (\\d{1,2})${E}`, "u"), (m) => (out.due = nextDayOfMonth(t, Number(m[1]))) !== null));
    if (!found && out.repeat !== "none") out.due = t;
  }
  if (out.repeat === "monthly" && out.due === null) out.due = addMonths(ctx.today, 0);

  out.title = text.replace(/\s+/g, " ").trim();
  return out;
}
