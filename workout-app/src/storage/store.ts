import type { Profile, Workout } from '../domain/types';
import { createStore } from './createStore';

// Persistent app data. The whole history is a few hundred KB even after years
// of training, so one JSON blob in localStorage is simpler and safer than
// IndexedDB. `migrate` keeps older saves loadable when the shape evolves.

export interface AppState {
  version: 1;
  profile: Profile | null;
  workouts: Workout[];
  active: Workout | null;
}

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

const store = createStore(initial, { key: 'nowauu-workout', migrate });

export const getState = store.get;
export const setState = store.set;
export const useAppState = store.use;

export function exportJson(): string {
  return JSON.stringify(store.get(), null, 2);
}

export function importJson(text: string) {
  const next = migrate(JSON.parse(text));
  store.set(() => next);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
