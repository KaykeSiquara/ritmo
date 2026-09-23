import { useRef, useSyncExternalStore } from "react";
import { todayOf } from "../domain/dates";
import type { Lang } from "../domain/types";
import { seed } from "./seed";
import { reducer, UNDOABLE, validate, type Action, type State, type Undoable } from "./state";

export const STORAGE_KEY = "ritmo:v1";
type Listener = () => void;

export type Store = {
  get: () => State;
  dispatch: (a: Action, label?: string) => void;
  undo: () => boolean;
  lastUndo: () => Undoable | null;
  subscribe: (l: Listener) => () => void;
};

export function load(fallbackLang: Lang): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.version === 1 ? validate(parsed.data) : null;
      if (state) return state;
    }
  } catch { return seed(fallbackLang, todayOf()); }
  return seed(fallbackLang, todayOf());
}

export function createStore(initial: State, persist = true): Store {
  let state = initial;
  let undo: Undoable | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<Listener>();
  const save = () => {
    if (!persist) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: state })); } catch { return; } }, 120);
  };
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => state,
    dispatch: (a, label) => {
      const next = reducer(state, a);
      if (next === state) return;
      undo = UNDOABLE.has(a.type) ? { state, label: label ?? a.type } : a.type === "timer/set" ? undo : null;
      state = next;
      save();
      emit();
    },
    undo: () => {
      if (!undo) return false;
      state = { ...undo.state, timer: state.timer };
      undo = null;
      save();
      emit();
      return true;
    },
    lastUndo: () => undo,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export function useStore<T>(store: Store, select: (s: State) => T): T {
  const cache = useRef<{ state: State | null; select: ((s: State) => T) | null; value: T | undefined }>({ state: null, select: null, value: undefined });
  const get = () => {
    const state = store.get();
    const c = cache.current;
    if (c.state !== state || c.select !== select) {
      const value = select(state);
      cache.current = { state, select, value: c.state !== null && shallowEqual(value, c.value) ? c.value : value };
    }
    return cache.current.value as T;
  };
  return useSyncExternalStore(store.subscribe, get, get);
}
