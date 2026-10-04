import type { ExerciseLog, Profile, SetEntry, Workout } from '../domain/types';
import { getState, setState, uid } from './store';
import { stopRest, summaryStore } from './ui';

// All mutations live here so pages never hand-edit nested state.

export const DEFAULT_REST = 90;

export function saveProfile(profile: Profile) {
  setState((s) => ({ ...s, profile: { ...s.profile, ...profile } }));
}

/** Sets of the most recent workout that contains the exercise (for "Précédent"). */
export function previousSetsFor(exerciseId: string): SetEntry[] {
  const { workouts } = getState();
  for (let i = workouts.length - 1; i >= 0; i--) {
    const log = workouts[i].exercises.find((l) => l.exerciseId === exerciseId);
    if (log) return log.sets;
  }
  return [];
}

function freshSets(exerciseId: string, count: number): SetEntry[] {
  const prev = previousSetsFor(exerciseId);
  const fallback = prev.filter((s) => !s.warmup).at(-1) ?? { weightKg: 0, reps: 10 };
  return Array.from({ length: count }, (_, i) => ({
    weightKg: prev[i]?.weightKg ?? fallback.weightKg,
    reps: prev[i]?.reps ?? fallback.reps,
    warmup: prev[i]?.warmup,
    done: false,
  }));
}

/** Starts an empty workout, or a copy of `templateId` with fresh, unvalidated sets. */
export function startWorkout(templateId?: string) {
  const { profile, workouts } = getState();
  if (!profile) return;
  const template = templateId ? workouts.find((w) => w.id === templateId) : undefined;
  const exercises: ExerciseLog[] = (template?.exercises ?? []).map((l) => ({
    uid: uid(),
    exerciseId: l.exerciseId,
    sets: freshSets(l.exerciseId, l.sets.length),
  }));
  const w: Workout = {
    id: uid(),
    startedAt: Date.now(),
    bodyweightKg: profile.bodyweightKg,
    exercises,
  };
  setState((s) => ({ ...s, active: w }));
}

function updateActive(fn: (w: Workout) => Workout) {
  setState((s) => (s.active ? { ...s, active: fn(s.active) } : s));
}

function updateLog(logUid: string, fn: (l: ExerciseLog) => ExerciseLog) {
  updateActive((w) => ({ ...w, exercises: w.exercises.map((l) => (l.uid === logUid ? fn(l) : l)) }));
}

export function addExercises(exerciseIds: string[], setCount: number) {
  updateActive((w) => ({
    ...w,
    exercises: [...w.exercises, ...exerciseIds.map((id) => ({ uid: uid(), exerciseId: id, sets: freshSets(id, setCount) }))],
  }));
}

export function removeExercise(logUid: string) {
  updateActive((w) => ({ ...w, exercises: w.exercises.filter((l) => l.uid !== logUid) }));
}

export function moveExercise(logUid: string, delta: -1 | 1) {
  updateActive((w) => {
    const i = w.exercises.findIndex((l) => l.uid === logUid);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= w.exercises.length) return w;
    const exercises = [...w.exercises];
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
    return { ...w, exercises };
  });
}

export function updateSet(logUid: string, index: number, patch: Partial<SetEntry>) {
  updateLog(logUid, (l) => ({ ...l, sets: l.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
}

export function addSet(logUid: string) {
  updateLog(logUid, (l) => {
    const last = l.sets.filter((s) => !s.warmup).at(-1) ?? l.sets.at(-1) ?? { weightKg: 0, reps: 10 };
    return { ...l, finishedAt: undefined, sets: [...l.sets, { weightKg: last.weightKg, reps: last.reps, done: false }] };
  });
}

export function removeSet(logUid: string, index: number) {
  updateLog(logUid, (l) => ({ ...l, sets: l.sets.filter((_, i) => i !== index) }));
}

export function finishExercise(logUid: string) {
  updateLog(logUid, (l) => ({ ...l, finishedAt: Date.now() }));
}

export function reopenExercise(logUid: string) {
  updateLog(logUid, (l) => ({ ...l, finishedAt: undefined }));
}

export function finishWorkout() {
  const { active } = getState();
  if (!active) return;
  // Keep only validated sets; drop blocks left empty — they carry no information.
  const exercises = active.exercises
    .map((l) => ({ ...l, sets: l.sets.filter((x) => x.done && x.reps > 0) }))
    .filter((l) => l.sets.length > 0);
  stopRest();
  if (!exercises.length) {
    setState((s) => ({ ...s, active: null }));
    return;
  }
  const done: Workout = { ...active, exercises, endedAt: Date.now() };
  setState((s) => ({ ...s, active: null, workouts: [...s.workouts, done] }));
  summaryStore.set(() => done.id);
}

export function cancelWorkout() {
  stopRest();
  setState((s) => ({ ...s, active: null }));
}

export function deleteWorkout(id: string) {
  setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
}

export function clearHistory() {
  stopRest();
  setState((s) => ({ ...s, workouts: [], active: null }));
}
