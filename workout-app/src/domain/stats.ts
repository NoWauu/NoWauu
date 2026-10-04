import { MUSCLE_BY_ID } from './muscles';
import { bestByExercise, isWorkingSet, scoreSets, tierFromScore } from './ranking';
import type { Exercise, MuscleGroupId, Sex, Workout } from './types';

export interface WorkoutStats {
  durationMin: number | null;
  sets: number;
  /** Sum of weight × reps over working sets with external load, in kg. */
  tonnage: number;
}

export function workoutStats(w: Workout, exercises: Record<string, Exercise>): WorkoutStats {
  let sets = 0;
  let tonnage = 0;
  for (const log of w.exercises) {
    const ex = exercises[log.exerciseId];
    for (const s of log.sets) {
      if (!isWorkingSet(s)) continue;
      sets++;
      if (ex?.scoring.kind === 'load') tonnage += s.weightKg * s.reps * (ex.perSide ? 2 : 1);
    }
  }
  const end = w.endedAt ?? Date.now();
  return { durationMin: Math.round((end - w.startedAt) / 60000), sets, tonnage };
}

/** "Pectoraux · Épaules · Triceps": the three most-trained groups of a workout. */
export function workoutTitle(w: Workout, exercises: Record<string, Exercise>): string {
  const count = new Map<MuscleGroupId, number>();
  for (const log of w.exercises) {
    const ex = exercises[log.exerciseId];
    if (!ex) continue;
    const n = log.sets.filter((s) => !s.warmup).length || 1;
    for (const g of ex.primary) count.set(g, (count.get(g) ?? 0) + n);
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return top.length ? top.map(([g]) => MUSCLE_BY_ID[g].name).join(' · ') : 'Séance libre';
}

export interface ExerciseOutcome {
  exerciseId: string;
  score: number;
  previousScore: number | null;
  /** first = never done before, record = beat every earlier workout. */
  status: 'first' | 'record' | 'none';
  tierUp: boolean;
}

/** Rank reached on each exercise of `w`, compared with all earlier workouts. */
export function workoutOutcomes(
  w: Workout,
  all: Workout[],
  exercises: Record<string, Exercise>,
  sex: Sex,
): ExerciseOutcome[] {
  const before = all.filter((x) => x.startedAt < w.startedAt && x.id !== w.id);
  const best = bestByExercise(before, exercises, sex);
  const out: ExerciseOutcome[] = [];
  for (const log of w.exercises) {
    const ex = exercises[log.exerciseId];
    if (!ex || out.some((r) => r.exerciseId === ex.id)) continue;
    const sets = w.exercises.filter((l) => l.exerciseId === ex.id).flatMap((l) => l.sets);
    const { score, bestSet } = scoreSets(ex, sets, w.bodyweightKg, sex);
    if (!bestSet) continue;
    const prev = best.get(ex.id)?.score ?? null;
    out.push({
      exerciseId: ex.id,
      score,
      previousScore: prev,
      status: prev === null ? 'first' : score > prev + 1e-9 ? 'record' : 'none',
      tierUp: prev !== null && tierFromScore(score).index > tierFromScore(prev).index,
    });
  }
  return out;
}

export function formatTonnage(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1).replace('.', ',')} t` : `${Math.round(kg)} kg`;
}

export function formatDuration(min: number | null): string {
  if (min === null) return '–';
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

/** Number of personal records set in each workout, in one chronological pass. */
export function recordCounts(workouts: Workout[], exercises: Record<string, Exercise>, sex: Sex): Map<string, number> {
  const best = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    let n = 0;
    const scores = new Map<string, number>();
    for (const log of w.exercises) {
      const ex = exercises[log.exerciseId];
      if (!ex || scores.has(ex.id)) continue;
      const sets = w.exercises.filter((l) => l.exerciseId === ex.id).flatMap((l) => l.sets);
      const r = scoreSets(ex, sets, w.bodyweightKg, sex);
      if (r.bestSet) scores.set(ex.id, r.score);
    }
    for (const [id, score] of scores) {
      const prev = best.get(id);
      if (prev !== undefined && score > prev + 1e-9) n++;
      if (prev === undefined || score > prev) best.set(id, score);
    }
    counts.set(w.id, n);
  }
  return counts;
}
