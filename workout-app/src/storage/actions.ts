import type { ExerciseLog, Profile, SetEntry, Workout } from '../domain/types';
import { getState, setState, uid } from './store';

// All mutations live here so pages never hand-edit nested state.

export function saveProfile(profile: Profile) {
  setState((s) => ({ ...s, profile }));
}

export function startWorkout() {
  const { profile } = getState();
  if (!profile) return;
  const w: Workout = {
    id: uid(),
    startedAt: Date.now(),
    bodyweightKg: profile.bodyweightKg,
    sex: profile.sex,
    exercises: [],
  };
  setState((s) => ({ ...s, active: w }));
}

function updateActive(fn: (w: Workout) => Workout) {
  setState((s) => (s.active ? { ...s, active: fn(s.active) } : s));
}

function updateLog(logUid: string, fn: (l: ExerciseLog) => ExerciseLog) {
  updateActive((w) => ({ ...w, exercises: w.exercises.map((l) => (l.uid === logUid ? fn(l) : l)) }));
}

/** Last performed sets for an exercise, used to pre-fill a new block. */
export function lastSetsFor(exerciseId: string): SetEntry[] | null {
  const { workouts } = getState();
  for (let i = workouts.length - 1; i >= 0; i--) {
    const log = workouts[i].exercises.find((l) => l.exerciseId === exerciseId);
    if (log) return log.sets.filter((s) => s.done);
  }
  return null;
}

export function addExercise(exerciseId: string, setCount: number) {
  const previous = lastSetsFor(exerciseId) ?? [];
  const template = previous[previous.length - 1] ?? { weightKg: 0, reps: 10 };
  const sets: SetEntry[] = Array.from({ length: setCount }, (_, i) => ({
    weightKg: previous[i]?.weightKg ?? template.weightKg,
    reps: previous[i]?.reps ?? template.reps,
    done: false,
  }));
  updateActive((w) => ({ ...w, exercises: [...w.exercises, { uid: uid(), exerciseId, sets }] }));
}

export function removeExercise(logUid: string) {
  updateActive((w) => ({ ...w, exercises: w.exercises.filter((l) => l.uid !== logUid) }));
}

export function updateSet(logUid: string, index: number, patch: Partial<SetEntry>) {
  updateLog(logUid, (l) => ({ ...l, sets: l.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
}

export function addSet(logUid: string) {
  updateLog(logUid, (l) => {
    const last = l.sets[l.sets.length - 1] ?? { weightKg: 0, reps: 10 };
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
  setState((s) => {
    if (!s.active) return s;
    // Drop blocks with no completed set: they carry no information.
    const exercises = s.active.exercises
      .map((l) => ({ ...l, sets: l.sets.filter((x) => x.done && x.reps > 0) }))
      .filter((l) => l.sets.length > 0);
    if (!exercises.length) return { ...s, active: null };
    const done: Workout = { ...s.active, exercises, endedAt: Date.now() };
    return { ...s, active: null, workouts: [...s.workouts, done] };
  });
}

export function cancelWorkout() {
  setState((s) => ({ ...s, active: null }));
}

export function deleteWorkout(id: string) {
  setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
}
