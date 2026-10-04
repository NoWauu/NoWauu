import type { MuscleGroupId } from './types';

export interface MuscleGroup {
  id: MuscleGroupId;
  name: string;
  /** Used for the sex-based standard adjustment. */
  lowerBody: boolean;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest', name: 'Pectoraux', lowerBody: false },
  { id: 'shoulders', name: 'Épaules', lowerBody: false },
  { id: 'biceps', name: 'Biceps', lowerBody: false },
  { id: 'triceps', name: 'Triceps', lowerBody: false },
  { id: 'forearms', name: 'Avant-bras', lowerBody: false },
  { id: 'traps', name: 'Trapèzes', lowerBody: false },
  { id: 'lats', name: 'Dos (dorsaux)', lowerBody: false },
  { id: 'lowerBack', name: 'Lombaires', lowerBody: true },
  { id: 'abs', name: 'Abdominaux', lowerBody: false },
  { id: 'quads', name: 'Quadriceps', lowerBody: true },
  { id: 'hamstrings', name: 'Ischio-jambiers', lowerBody: true },
  { id: 'glutes', name: 'Fessiers', lowerBody: true },
  { id: 'calves', name: 'Mollets', lowerBody: true },
];

export const MUSCLE_BY_ID = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.id, m]),
) as Record<MuscleGroupId, MuscleGroup>;
