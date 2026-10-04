import { MUSCLE_GROUPS } from './muscles';
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

/** Weighted number of completed sets per muscle group in [from, to). */
export function weeklyVolume(
  workouts: Workout[],
  exercises: Record<string, Exercise>,
  from: Date,
  to: Date,
): Volume {
  const vol = emptyVolume();
  for (const w of workouts) {
    if (w.startedAt < from.getTime() || w.startedAt >= to.getTime()) continue;
    for (const log of w.exercises) {
      const ex = exercises[log.exerciseId];
      if (!ex) continue;
      const sets = log.sets.filter((s) => s.done && s.reps > 0).length;
      for (const g of ex.primary) vol[g] += sets;
      for (const g of ex.secondary) vol[g] += sets * SECONDARY_WEIGHT;
    }
  }
  return vol;
}

/**
 * Colour bands for weekly sets. ~10–20 hard sets per muscle per week is the
 * range most hypertrophy research converges on.
 */
export const VOLUME_BANDS = [
  { min: 0, max: 0, label: 'Repos', color: 'var(--muscle-idle)' },
  { min: 0.5, max: 4.5, label: '1–4 séries', color: '#3a86ff' },
  { min: 5, max: 9.5, label: '5–9 séries', color: '#06d6a0' },
  { min: 10, max: 20, label: '10–20 (optimal)', color: '#ffd166' },
  { min: 20.5, max: Infinity, label: '20+ séries', color: '#ef476f' },
];

export function volumeColor(sets: number): string {
  if (sets <= 0) return VOLUME_BANDS[0].color;
  return (VOLUME_BANDS.slice(1).find((b) => sets <= b.max) ?? VOLUME_BANDS[VOLUME_BANDS.length - 1]).color;
}
