import { useSyncExternalStore } from 'react';

// Minimal external store (≈ Zustand without the dependency). Components read a
// slice with `use(selector)`; selectors must return stable references (a state
// field, a primitive) — derive anything else with useMemo.

export interface Store<T> {
  get(): T;
  set(update: (s: T) => T): void;
  use<U>(selector: (s: T) => U): U;
}

export function createStore<T>(initial: T, persist?: { key: string; migrate: (raw: unknown) => T }): Store<T> {
  let state = initial;
  if (persist) {
    try {
      const raw = localStorage.getItem(persist.key);
      if (raw) state = persist.migrate(JSON.parse(raw));
    } catch {
      // Corrupted or blocked storage: start fresh rather than crash.
    }
  }
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  return {
    get: () => state,
    set(update) {
      state = update(state);
      if (persist) {
        try {
          localStorage.setItem(persist.key, JSON.stringify(state));
        } catch {
          // Storage full or blocked (private mode): keep working in memory.
        }
      }
      listeners.forEach((l) => l());
    },
    use: (selector) => useSyncExternalStore(subscribe, () => selector(state)),
  };
}
