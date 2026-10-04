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
  /** Main colour: muscle fills, bars, emblem body. */
  color: string;
  /** Darker / lighter steps of the same hue, for emblem gradients. */
  dark: string;
  light: string;
}

// A "heat" scale: every tier is lighter than the one before (OKLCH L 0.48 →
// 0.95), so the order reads even in grayscale or with colour-blindness, while
// the hue walks violet → magenta → orange → gold → ice-white for identity.
// Validated: adjacent CVD ΔE ≥ 9.7, normal-vision ΔE ≥ 16.3 on the dark surface.
// Tier colour is never the only cue: emblems add a shape, labels add the name.
export const TIERS: Tier[] = [
  { id: 'novice', name: 'Novice', color: '#585b7a', dark: '#3a3d5a', light: '#8083a4' },
  { id: 'intermediate', name: 'Intermédiaire', color: '#8e60d2', dark: '#65389f', light: '#b28fef' },
  { id: 'advanced', name: 'Avancé', color: '#e65aa5', dark: '#b2307a', light: '#ff90c8' },
  { id: 'elite', name: 'Élite', color: '#ff8152', dark: '#d4552b', light: '#ffb988' },
  { id: 'monster', name: 'Monster', color: '#ffc336', dark: '#d98b09', light: '#ffe586' },
  { id: 'legend', name: 'Legend', color: '#bbfcff', dark: '#71c5df', light: '#efffff' },
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

/** A set that counts: validated, not a warm-up, at least one rep. */
export function isWorkingSet(set: SetEntry): boolean {
  return set.done && !set.warmup && set.reps > 0;
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
    if (!isWorkingSet(set)) continue;
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
  // Express the gap as extra estimated 1RM, rounded up to the next 0.5 kg.
  const kg = Math.ceil((next - value) * bodyweightKg * 2) / 2;
  return `+${String(kg).replace('.', ',')} kg au 1RM`;
}

/** Absolute value for display: estimated 1RM in kg (load) or reps / seconds. */
export function displayValue(ex: Exercise, ratioOrReps: number, bodyweightKg: number): number {
  return ex.scoring.kind === 'reps' ? ratioOrReps : ratioOrReps * bodyweightKg;
}

export interface HistoryPoint {
  date: number;
  workoutId: string;
  /** Estimated 1RM in kg, or max reps / seconds. */
  value: number;
  score: number;
  bestSet: SetEntry;
}

/** Best performance of an exercise in every workout that contains it, oldest first. */
export function exerciseHistory(ex: Exercise, workouts: Workout[], sex: Sex): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (const w of workouts) {
    const sets = w.exercises.filter((l) => l.exerciseId === ex.id).flatMap((l) => l.sets);
    const r = scoreSets(ex, sets, w.bodyweightKg, sex);
    if (!r.bestSet) continue;
    points.push({
      date: w.startedAt,
      workoutId: w.id,
      value: displayValue(ex, r.value, w.bodyweightKg),
      score: r.score,
      bestSet: r.bestSet,
    });
  }
  return points.sort((a, b) => a.date - b.date);
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
 * bodyweight recorded *in that workout* (a fact of that day) and the current
 * profile's standards (a setting). `sinceMs` lets you restrict to a recent
 * window if you prefer a rank that can decay.
 */
export function bestByExercise(
  workouts: Workout[],
  exercises: Record<string, Exercise>,
  sex: Sex,
  sinceMs = 0,
): Map<string, BestEntry> {
  const best = new Map<string, BestEntry>();
  for (const w of workouts) {
    if (w.startedAt < sinceMs) continue;
    for (const log of w.exercises) {
      const ex = exercises[log.exerciseId];
      if (!ex) continue;
      const r = scoreSets(ex, log.sets, w.bodyweightKg, sex);
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
