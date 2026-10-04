import { useMemo } from 'react';
import { EXERCISE_BY_ID } from '../data/exercises';
import { useAppState } from '../storage/store';
import { bestByExercise, globalRank, groupRanks } from '../domain/ranking';

/** Ranks derived from the saved history; recomputed only when it changes. */
export function useRanks() {
  const workouts = useAppState((s) => s.workouts);
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  return useMemo(() => {
    const best = bestByExercise(workouts, EXERCISE_BY_ID, sex);
    const groups = groupRanks(best, EXERCISE_BY_ID);
    return { best, groups, global: globalRank(groups) };
  }, [workouts, sex]);
}
