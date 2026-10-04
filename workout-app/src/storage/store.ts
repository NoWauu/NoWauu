import { useSyncExternalStore } from 'react';
import type { Profile, Workout } from '../domain/types';

// Single source of truth, persisted to localStorage. The whole app state is a
// few hundred KB even after years of training, so a plain JSON blob is simpler
// and safer than IndexedDB here. The `version` field + `migrate` keep old
// saves loadable when the shape changes.

export interface AppState {
  version: 1;
  profile: Profile | null;
  workouts: Workout[];
  active: Workout | null;
}

const KEY = 'nowauu-workout';

const initial: AppState = { version: 1, profile: null, workouts: [], active: null };

function migrate(raw: unknown): AppState {
  const s = raw as Partial<AppState> | null;
  if (!s || typeof s !== 'object') return initial;
  return {
    version: 1,
    profile: s.profile ?? null,
    workouts: Array.isArray(s.workouts) ? s.workouts : [],
    active: s.active ?? null,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : initial;
  } catch {
    return initial;
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
}

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// ---------------------------------------------------------------- Backup

export function exportJson(): string {
  return JSON.stringify(state, null, 2);
}

export function importJson(text: string) {
  const next = migrate(JSON.parse(text));
  setState(() => next);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
