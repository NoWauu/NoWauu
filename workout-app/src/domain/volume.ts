import { MUSCLE_GROUPS } from './muscles';
import { isWorkingSet } from './ranking';
import type { Exercise, MuscleGroupId, Workout } from './types';

/** A set counts fully for primary muscles and half for secondary ones. */
export const SECONDARY_WEIGHT = 0.5;

/** Monday 00:00 (local time) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type Volume = Record<MuscleGroupId, number>;

export function emptyVolume(): Volume {
  return Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.id, 0])) as Volume;
}

export function workoutsBetween(workouts: Workout[], from: Date, to: Date): Workout[] {
  return workouts.filter((w) => w.startedAt >= from.getTime() && w.startedAt < to.getTime());
}

/** Weighted number of working sets per muscle group. */
export function volumeOf(workouts: Workout[], exercises: Record<string, Exercise>): Volume {
  const vol = emptyVolume();
  for (const w of workouts) {
    for (const log of w.exercises) {
      const ex = exercises[log.exerciseId];
      if (!ex) continue;
      const sets = log.sets.filter(isWorkingSet).length;
      for (const g of ex.primary) vol[g] += sets;
      for (const g of ex.secondary) vol[g] += sets * SECONDARY_WEIGHT;
    }
  }
  return vol;
}

export function weeklyVolume(
  workouts: Workout[],
  exercises: Record<string, Exercise>,
  from: Date,
  to: Date,
): Volume {
  return volumeOf(workoutsBetween(workouts, from, to), exercises);
}

/**
 * Weekly sets are a magnitude, so they get a single-hue sequential ramp
 * (dark → light on the dark theme), never a rainbow. ~10–20 hard sets per
 * muscle per week is where most hypertrophy research converges.
 */
export const VOLUME_BANDS = [
  { max: 4.5, label: '1–4', color: '#185a89' },
  { max: 9.5, label: '5–9', color: '#0a78b7' },
  { max: 14.5, label: '10–14', color: '#1b9ddd' },
  { max: 20, label: '15–20', color: '#4dc4ee' },
  { max: Infinity, label: '20+', color: '#8de8f8' },
];

export const TARGET_SETS = { min: 10, max: 20 };

export function volumeColor(sets: number): string | null {
  if (sets <= 0) return null;
  return VOLUME_BANDS.find((b) => sets <= b.max)!.color;
}
