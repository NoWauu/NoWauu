import { memo } from 'react';
import { MUSCLE_BY_ID } from '../../domain/muscles';
import type { MuscleGroupId, Sex } from '../../domain/types';
import { FEMALE, MALE, type BodySlug, type BodyView } from './bodyPaths';

/** Which drawn region belongs to which trained group. Unlisted slugs are skin. */
const SLUG_TO_GROUP: Partial<Record<BodySlug, MuscleGroupId>> = {
  chest: 'chest',
  deltoids: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  abs: 'abs',
  obliques: 'obliques',
  trapezius: 'traps',
  'upper-back': 'lats',
  'lower-back': 'lowerBack',
  gluteal: 'glutes',
  quadriceps: 'quads',
  adductors: 'adductors',
  hamstring: 'hamstrings',
  calves: 'calves',
};

const HAIR: BodySlug[] = ['hair'];

export type Side = 'front' | 'back';

export interface BodyMapProps {
  sex: Sex;
  /** Fill for a group; `null` = untouched muscle (drawn in the idle tone). */
  fill: (g: MuscleGroupId) => string | null;
  sides?: Side[];
  selected?: MuscleGroupId | null;
  onSelect?: (g: MuscleGroupId) => void;
  /** Show "Face" / "Dos" captions. */
  captions?: boolean;
  className?: string;
}

function Figure({ view, side, fill, selected, onSelect, caption }: {
  view: BodyView;
  side: Side;
  fill: BodyMapProps['fill'];
  selected?: MuscleGroupId | null;
  onSelect?: (g: MuscleGroupId) => void;
  caption: boolean;
}) {
  const interactive = !!onSelect;
  return (
    <figure className="body-figure">
      <svg viewBox={view.viewBox} role="img" aria-label={side === 'front' ? 'Vue de face' : 'Vue de dos'}>
        <path className="body-outline" d={view.outline} />
        {view.parts.map(({ slug, d }) => {
          const group = SLUG_TO_GROUP[slug];
          if (!group) {
            return (
              <g key={slug} className={HAIR.includes(slug) ? 'body-hair' : 'body-skin'}>
                {d.map((p, i) => (
                  <path key={i} d={p} />
                ))}
              </g>
            );
          }
          const color = fill(group);
          const state = selected ? (selected === group ? ' is-selected' : ' is-dimmed') : '';
          const name = MUSCLE_BY_ID[group].name;
          return (
            <g
              key={slug}
              className={`body-muscle${color ? '' : ' is-idle'}${state}`}
              style={color ? { fill: color } : undefined}
              {...(interactive && {
                role: 'button',
                tabIndex: 0,
                'aria-label': name,
                'aria-pressed': selected === group,
                onClick: () => onSelect!(group),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect!(group);
                  }
                },
              })}
            >
              <title>{name}</title>
              {d.map((p, i) => (
                <path key={i} d={p} />
              ))}
            </g>
          );
        })}
      </svg>
      {caption && <figcaption>{side === 'front' ? 'Face' : 'Dos'}</figcaption>}
    </figure>
  );
}

export const BodyMap = memo(function BodyMap({
  sex,
  fill,
  sides = ['front', 'back'],
  selected,
  onSelect,
  captions = false,
  className = '',
}: BodyMapProps) {
  const views = sex === 'F' ? FEMALE : MALE;
  return (
    <div className={`body-map ${onSelect ? 'is-interactive' : ''} ${className}`}>
      {sides.map((side) => (
        <Figure
          key={side}
          side={side}
          view={views[side]}
          fill={fill}
          selected={selected}
          onSelect={onSelect}
          caption={captions}
        />
      ))}
    </div>
  );
});

/** Which side shows more of these groups — used for single-view thumbnails. */
const BACK_GROUPS = new Set<MuscleGroupId>(['traps', 'lats', 'lowerBack', 'glutes', 'hamstrings', 'triceps']);
export function bestSide(groups: MuscleGroupId[]): Side {
  const back = groups.filter((g) => BACK_GROUPS.has(g)).length;
  return back > groups.length - back ? 'back' : 'front';
}
