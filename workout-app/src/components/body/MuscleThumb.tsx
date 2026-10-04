import { memo } from 'react';
import type { Exercise, MuscleGroupId, Sex } from '../../domain/types';
import { bestSide } from './BodyMap';
import { FEMALE, MALE, type BodySlug } from './bodyPaths';

const GROUP_SLUG: Record<MuscleGroupId, BodySlug> = {
  chest: 'chest',
  shoulders: 'deltoids',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  traps: 'trapezius',
  lats: 'upper-back',
  lowerBack: 'lower-back',
  glutes: 'gluteal',
  quads: 'quadriceps',
  adductors: 'adductors',
  hamstrings: 'hamstring',
  calves: 'calves',
};

/**
 * Square close-up of the body zoomed on an exercise's primary muscles: far
 * more legible at 44 px than a whole silhouette. Only parts intersecting the
 * crop are rendered, keeping long lists light.
 */
export const MuscleThumb = memo(function MuscleThumb({ ex, sex, size = 44 }: { ex: Exercise; sex: Sex; size?: number }) {
  const side = bestSide(ex.primary);
  const view = (sex === 'F' ? FEMALE : MALE)[side];
  const [vx, vy, vw, vh] = view.viewBox.split(' ').map(Number);

  const targets = new Set(ex.primary.map((g) => GROUP_SLUG[g]));
  const boxes = view.parts.filter((p) => targets.has(p.slug)).map((p) => p.box);
  let x0 = Math.min(...boxes.map((b) => b[0]));
  let y0 = Math.min(...boxes.map((b) => b[1]));
  let x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  let y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  if (!boxes.length) [x0, y0, x1, y1] = [vx, vy, vx + vw, vy + vh];

  // Square crop with breathing room, never smaller than a third of the body.
  const span = Math.max(Math.min(Math.max(x1 - x0, y1 - y0) * 1.3, vh), vh / 3);
  // Keep the crop inside the figure (or centred on it when wider than the figure).
  const fit = (c: number, lo: number, len: number) =>
    span >= len ? lo + len / 2 : Math.min(Math.max(c, lo + span / 2), lo + len - span / 2);
  const cx = fit((x0 + x1) / 2, vx, vw);
  const cy = fit((y0 + y1) / 2, vy, vh);
  const crop = [cx - span / 2, cy - span / 2, span, span];
  const visible = (b: number[]) => b[0] < crop[0] + crop[2] && b[0] + b[2] > crop[0] && b[1] < crop[1] + crop[3] && b[1] + b[3] > crop[1];

  const secondary = new Set(ex.secondary.map((g) => GROUP_SLUG[g]));
  return (
    <span className="muscle-thumb" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox={crop.join(' ')} width={size} height={size}>
        <path className="body-outline" d={view.outline} />
        {view.parts.filter((p) => visible(p.box)).map((p) => (
          <g
            key={p.slug}
            className={
              targets.has(p.slug) ? 'thumb-primary' : secondary.has(p.slug) ? 'thumb-secondary' : 'thumb-rest'
            }
          >
            {p.d.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        ))}
      </svg>
    </span>
  );
});
