import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { todayOf, type Day } from "../domain/dates";
import type { State } from "../store/state";
import { useStore, type Store } from "../store/store";

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useApp() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useApp needs StoreProvider");
  return store;
}

export function useSelect<T>(select: (s: State) => T): T {
  return useStore(useApp(), select);
}

export function useToday(): Day {
  const [day, setDay] = useState(todayOf);
  useEffect(() => {
    const id = setInterval(() => setDay((d) => (d === todayOf() ? d : todayOf())), 30_000);
    return () => clearInterval(id);
  }, []);
  return day;
}

export function useNow(active: boolean, every = 250) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [active, every]);
  return active ? now : Date.now();
}
