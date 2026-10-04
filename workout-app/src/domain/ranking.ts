import { MUSCLE_BY_ID, MUSCLE_GROUPS } from './muscles';
import type { Exercise, MuscleGroupId, SetEntry, Sex, Workout } from './types';

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------
// A rank is a continuous *score* in [0, 6]. The integer part is the tier, the
// fractional part is the progress toward the next one. Averages (group,
// global) are computed on scores, never on tier labels: averaging "Élite" and
// "Novice" is meaningless, averaging 3.8 and 0.4 is not.

export interface Tier {
  id: string;
  name: string;
  color: string;
}

export const TIERS: Tier[] = [
  { id: 'novice', name: 'Novice', color: '#8d99ae' },
  { id: 'intermediate', name: 'Intermédiaire', color: '#4cc9f0' },
  { id: 'advanced', name: 'Avancé', color: '#43aa8b' },
  { id: 'elite', name: 'Élite', color: '#f9c74f' },
  { id: 'monster', name: 'Monster', color: '#f3722c' },
  { id: 'legend', name: 'Legend', color: '#c77dff' },
];

export const MAX_SCORE = TIERS.length;

/**
 * Tier entry thresholds as multiples of an exercise's `ref` (the "Avancé"
 * entry). Index i is the value needed to *enter* tier i+1; the last value is
 * the top of the Legend bar. Sharing one curve keeps every exercise on the
 * same difficulty shape, so each exercise only needs one calibrated number.
 */
export const TIER_CURVE = [0.75, 1, 1.3, 1.6, 1.95, 2.4];

/** Women's standards as a fraction of men's (≈ ratios from public strength standards). */
const FEMALE_FACTOR = { upper: 0.65, lower: 0.76 };

// ---------------------------------------------------------------------------
// Per-set performance
// ---------------------------------------------------------------------------

/** Epley estimated one-rep max. Reps are capped: the formula drifts past ~20. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 20) / 30);
}

/** The raw number a set is judged on: e1RM/bodyweight ratio, or a rep count. */
export function setPerformance(ex: Exercise, set: SetEntry, bodyweightKg: number): number {
  if (set.reps <= 0) return 0;
  const s = ex.scoring;
  if (s.kind === 'reps') return set.reps;
  const moved = set.weightKg + (s.bodyweightFactor ?? 0) * bodyweightKg;
  return estimate1RM(moved, set.reps) / bodyweightKg;
}

export function thresholdsFor(ex: Exercise, sex: Sex): number[] {
  let ref = ex.scoring.ref;
  if (sex === 'F') {
    const lower = ex.primary.some((g) => MUSCLE_BY_ID[g].lowerBody);
    ref *= lower ? FEMALE_FACTOR.lower : FEMALE_FACTOR.upper;
  }
  return TIER_CURVE.map((m) => m * ref);
}

/** Piecewise-linear mapping from a performance value to a score in [0, 6]. */
export function scoreFromValue(value: number, thresholds: number[]): number {
  if (value <= 0) return 0;
  let lo = 0;
  for (let i = 0; i < thresholds.length; i++) {
    const hi = thresholds[i];
    if (value < hi) return i + (value - lo) / (hi - lo);
    lo = hi;
  }
  return MAX_SCORE;
}

export interface TierInfo {
  tier: Tier;
  index: number;
  /** 0..1 progress inside the current tier. */
  progress: number;
}

export function tierFromScore(score: number): TierInfo {
  const clamped = Math.max(0, Math.min(score, MAX_SCORE));
  const index = Math.min(Math.floor(clamped), TIERS.length - 1);
  return { tier: TIERS[index], index, progress: Math.min(clamped - index, 1) };
}

// ---------------------------------------------------------------------------
// Per-exercise result (what is shown when you tap "Terminer l'exo")
// ---------------------------------------------------------------------------

export interface ExerciseResult {
  score: number;
  value: number;
  bestSet: SetEntry | null;
}

export function scoreSets(ex: Exercise, sets: SetEntry[], bodyweightKg: number, sex: Sex): ExerciseResult {
  const thresholds = thresholdsFor(ex, sex);
  let best: ExerciseResult = { score: 0, value: 0, bestSet: null };
  for (const set of sets) {
    if (!set.done) continue;
    const value = setPerformance(ex, set, bodyweightKg);
    if (value > best.value) best = { score: scoreFromValue(value, thresholds), value, bestSet: set };
  }
  return best;
}

/** Human-readable distance to the next tier, e.g. "+7.5 kg" or "+3 reps". */
export function nextTierHint(ex: Exercise, value: number, bodyweightKg: number, sex: Sex): string | null {
  const t = thresholdsFor(ex, sex);
  const next = t.find((x) => x > value);
  if (next === undefined || next === t[t.length - 1]) return null;
  const s = ex.scoring;
  if (s.kind === 'reps') return `+${Math.ceil(next - value)} ${s.unit === 'sec' ? 's' : 'reps'}`;
  // Express the gap as extra 1RM in kg (per side when relevant).
  const kg = (next - value) * bodyweightKg;
  return `+${(Math.ceil(kg * 2) / 2).toFixed(1)} kg de 1RM estimé`;
}

// ---------------------------------------------------------------------------
// Aggregation over history
// ---------------------------------------------------------------------------

export interface BestEntry {
  score: number;
  value: number;
  date: number;
  workoutId: string;
}

/**
 * Best score ever reached per exercise. Each workout is scored with the
 * bodyweight recorded *in that workout*. `sinceMs` lets you restrict to a
 * recent window if you prefer a rank that can decay.
 */
export function bestByExercise(
  workouts: Workout[],
  exercises: Record<string, Exercise>,
  sinceMs = 0,
): Map<string, BestEntry> {
  const best = new Map<string, BestEntry>();
  for (const w of workouts) {
    if (w.startedAt < sinceMs) continue;
    for (const log of w.exercises) {
      const ex = exercises[log.exerciseId];
      if (!ex) continue;
      const r = scoreSets(ex, log.sets, w.bodyweightKg, w.sex);
      if (r.value <= 0) continue;
      const prev = best.get(ex.id);
      if (!prev || r.score > prev.score || (r.score === prev.score && r.value > prev.value)) {
        best.set(ex.id, { score: r.score, value: r.value, date: w.startedAt, workoutId: w.id });
      }
    }
  }
  return best;
}

export interface GroupRank {
  group: MuscleGroupId;
  score: number | null;
  /** Exercises that contributed (only ones you have actually done). */
  contributors: { exerciseId: string; score: number }[];
}

/**
 * Group score = mean of the best scores of the exercises that target the
 * group as a *primary* muscle. Exercises never performed are ignored, so
 * doing only the bench press doesn't drag "Pectoraux" down for the flyes
 * you never tried.
 */
export function groupRanks(best: Map<string, BestEntry>, exercises: Record<string, Exercise>): GroupRank[] {
  return MUSCLE_GROUPS.map(({ id }) => {
    const contributors: GroupRank['contributors'] = [];
    for (const [exerciseId, entry] of best) {
      const ex = exercises[exerciseId];
      if (ex?.primary.includes(id)) contributors.push({ exerciseId, score: entry.score });
    }
    contributors.sort((a, b) => b.score - a.score);
    const score = contributors.length
      ? contributors.reduce((s, c) => s + c.score, 0) / contributors.length
      : null;
    return { group: id, score, contributors };
  });
}

/**
 * Global score = mean of *group* scores (not of exercises), so ten chest
 * variations cannot outweigh the rest of the body. Unrated groups are left
 * out; `coverage` tells how much of the body the rank is based on.
 */
export function globalRank(groups: GroupRank[]): { score: number | null; coverage: number } {
  const rated = groups.filter((g) => g.score !== null) as (GroupRank & { score: number })[];
  if (!rated.length) return { score: null, coverage: 0 };
  return {
    score: rated.reduce((s, g) => s + g.score, 0) / rated.length,
    coverage: rated.length / groups.length,
  };
}
