import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID } from '../data/exercises';
import {
  bestByExercise,
  estimate1RM,
  globalRank,
  groupRanks,
  scoreFromValue,
  scoreSets,
  thresholdsFor,
  tierFromScore,
} from './ranking';
import { startOfWeek, weeklyVolume } from './volume';
import type { Workout } from './types';

const bench = EXERCISE_BY_ID['bench-press'];
const pullUp = EXERCISE_BY_ID['pull-up'];

function workout(id: string, startedAt: number, exercises: Workout['exercises'], bw = 80): Workout {
  return { id, startedAt, bodyweightKg: bw, sex: 'M', exercises };
}

describe('estimate1RM', () => {
  it('returns the weight for a single and 0 for empty sets', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(0, 10)).toBe(0);
  });
  it('uses Epley and caps reps at 20', () => {
    expect(estimate1RM(90, 10)).toBeCloseTo(120);
    expect(estimate1RM(50, 40)).toBeCloseTo(estimate1RM(50, 20));
  });
});

describe('scoreFromValue', () => {
  const t = [1, 2, 3, 4, 5, 6];
  it('is continuous and piecewise linear', () => {
    expect(scoreFromValue(0, t)).toBe(0);
    expect(scoreFromValue(0.5, t)).toBeCloseTo(0.5);
    expect(scoreFromValue(1, t)).toBeCloseTo(1);
    expect(scoreFromValue(2.5, t)).toBeCloseTo(2.5);
  });
  it('caps at the top of Legend', () => {
    expect(scoreFromValue(100, t)).toBe(6);
    expect(tierFromScore(6).tier.name).toBe('Legend');
  });
});

describe('scoreSets', () => {
  it('reaches Avancé exactly at the reference ratio', () => {
    // 1RM = 84 kg at 80 kg bodyweight => ratio 1.05 = ref
    const r = scoreSets(bench, [{ weightKg: 84, reps: 1, done: true }], 80, 'M');
    expect(tierFromScore(r.score).tier.name).toBe('Avancé');
    expect(r.score).toBeCloseTo(2);
  });
  it('ignores sets not marked done and keeps the best one', () => {
    const r = scoreSets(
      bench,
      [
        { weightKg: 200, reps: 5, done: false },
        { weightKg: 60, reps: 10, done: true },
        { weightKg: 70, reps: 5, done: true },
      ],
      80,
      'M',
    );
    expect(r.bestSet?.weightKg).toBe(70);
  });
  it('counts bodyweight for weighted bodyweight exercises', () => {
    const bw = scoreSets(pullUp, [{ weightKg: 0, reps: 8, done: true }], 80, 'M');
    const weighted = scoreSets(pullUp, [{ weightKg: 20, reps: 8, done: true }], 80, 'M');
    expect(bw.value).toBeCloseTo(estimate1RM(80, 8) / 80);
    expect(weighted.score).toBeGreaterThan(bw.score);
  });
  it('uses lower thresholds for women', () => {
    expect(thresholdsFor(bench, 'F')[1]).toBeLessThan(thresholdsFor(bench, 'M')[1]);
  });
});

describe('aggregation', () => {
  const ws: Workout[] = [
    workout('a', 1, [{ uid: '1', exerciseId: 'bench-press', sets: [{ weightKg: 84, reps: 1, done: true }] }]),
    workout('b', 2, [
      { uid: '1', exerciseId: 'bench-press', sets: [{ weightKg: 60, reps: 1, done: true }] },
      { uid: '2', exerciseId: 'squat', sets: [{ weightKg: 108, reps: 1, done: true }] },
    ]),
  ];
  const best = bestByExercise(ws, EXERCISE_BY_ID);

  it('keeps the best score per exercise across workouts', () => {
    expect(best.get('bench-press')?.workoutId).toBe('a');
  });
  it('averages only exercises actually done, then groups for the global rank', () => {
    const groups = groupRanks(best, EXERCISE_BY_ID);
    const chest = groups.find((g) => g.group === 'chest')!;
    expect(chest.contributors).toHaveLength(1);
    expect(chest.score).toBeCloseTo(2);
    expect(groups.find((g) => g.group === 'biceps')!.score).toBeNull();
    const global = globalRank(groups);
    // chest, quads, glutes rated (squat is primary on quads + glutes)
    expect(global.coverage).toBeCloseTo(3 / 13);
    expect(global.score).toBeCloseTo(2);
  });
});

describe('weeklyVolume', () => {
  it('counts primary sets fully and secondary sets at half', () => {
    const monday = startOfWeek(new Date(2026, 9, 7)); // Wed 7 Oct 2026
    expect(monday.getDay()).toBe(1);
    const w = workout('w', monday.getTime() + 3600_000, [
      {
        uid: '1',
        exerciseId: 'bench-press',
        sets: [
          { weightKg: 60, reps: 8, done: true },
          { weightKg: 60, reps: 8, done: true },
          { weightKg: 60, reps: 8, done: false },
        ],
      },
    ]);
    const vol = weeklyVolume([w], EXERCISE_BY_ID, monday, new Date(monday.getTime() + 7 * 864e5));
    expect(vol.chest).toBe(2);
    expect(vol.triceps).toBe(1);
    expect(vol.quads).toBe(0);
  });
});
