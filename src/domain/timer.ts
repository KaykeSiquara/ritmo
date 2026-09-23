export type Phase = "focus" | "short" | "long";
export type TimerConfig = { focus: number; short: number; long: number; longEvery: number };
export type TimerState = { phase: Phase; running: boolean; endsAt: number | null; remainingMs: number; cycle: number; taskId: string | null };

export const durationMs = (phase: Phase, cfg: TimerConfig) => (phase === "focus" ? cfg.focus : phase === "short" ? cfg.short : cfg.long) * 60_000;

export const initialTimer = (cfg: TimerConfig): TimerState => ({ phase: "focus", running: false, endsAt: null, remainingMs: durationMs("focus", cfg), cycle: 0, taskId: null });

export const remaining = (s: TimerState, now: number) => (s.running && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs);

export const start = (s: TimerState, now: number): TimerState => (s.running ? s : { ...s, running: true, endsAt: now + s.remainingMs });

export const pause = (s: TimerState, now: number): TimerState => (s.running ? { ...s, running: false, endsAt: null, remainingMs: remaining(s, now) } : s);

export const reset = (s: TimerState, cfg: TimerConfig): TimerState => ({ ...s, running: false, endsAt: null, remainingMs: durationMs(s.phase, cfg) });

export function advance(s: TimerState, cfg: TimerConfig): TimerState {
  const cycle = s.phase === "focus" ? s.cycle + 1 : s.cycle;
  const phase: Phase = s.phase === "focus" ? (cycle % cfg.longEvery === 0 ? "long" : "short") : "focus";
  return { ...s, phase, cycle, running: false, endsAt: null, remainingMs: durationMs(phase, cfg) };
}

export const isFinished = (s: TimerState, now: number) => s.running && remaining(s, now) === 0;

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
