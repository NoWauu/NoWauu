// Core domain types. Everything persisted is a *fact* (what you lifted, what
// you weighed). Ranks, volumes and records are always *derived* from these
// facts, never stored — so tweaking the standards re-ranks your whole history.

export type MuscleGroupId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'lowerBack'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'adductors'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type Sex = 'M' | 'F';

export type Equipment =
  | 'Barre'
  | 'Haltères'
  | 'Machine'
  | 'Poulie'
  | 'Poids du corps'
  | 'Barre EZ';

/**
 * How an exercise is scored.
 * - `load`: estimated 1RM divided by bodyweight. `ref` is the ratio that
 *   reaches the "Avancé" tier for a man. When `bodyweightFactor` is set, the
 *   weight you enter is *added* load (belt, vest) and that fraction of your
 *   bodyweight is counted as moved too (pull-ups, dips).
 * - `reps`: max reps (or seconds) in a single set. `ref` is the count that
 *   reaches "Avancé".
 */
export type Scoring =
  | { kind: 'load'; ref: number; bodyweightFactor?: number }
  | { kind: 'reps'; ref: number; unit?: 'reps' | 'sec' };

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  primary: MuscleGroupId[];
  secondary: MuscleGroupId[];
  /** Weight entered is per dumbbell / per side. */
  perSide?: boolean;
  steps: string[];
  tips: string[];
  scoring: Scoring;
}

export interface SetEntry {
  weightKg: number;
  reps: number;
  done: boolean;
  /** Warm-up sets are logged but count for neither volume nor rank. */
  warmup?: boolean;
}

export interface ExerciseLog {
  /** Unique within the workout (the same exercise may appear twice). */
  uid: string;
  exerciseId: string;
  sets: SetEntry[];
  /** Set when the user taps "Terminer l'exo". */
  finishedAt?: number;
}

export interface Workout {
  id: string;
  startedAt: number;
  endedAt?: number;
  /** Bodyweight snapshot: a ratio is judged against what you weighed *then*. */
  bodyweightKg: number;
  exercises: ExerciseLog[];
}

export interface Profile {
  bodyweightKg: number;
  sex: Sex;
  /** Default rest between sets, in seconds. */
  restSeconds?: number;
  /** Beep when the rest timer ends. */
  restSound?: boolean;
}
