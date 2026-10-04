import { MUSCLE_BY_ID } from '../domain/muscles';
import type { MuscleGroupId } from '../domain/types';

// Stylised anatomical map. Each view is drawn on a 200×400 canvas; the left
// half of every symmetric muscle is described once and mirrored, so a single
// path edit stays symmetric. Non-muscle parts (head, hands, knees…) are drawn
// in a neutral colour to give the silhouette.

type Part = { group: MuscleGroupId | null; d: string; mirror?: boolean };

const HEAD = 'M100,12 C112,12 118,22 118,34 C118,46 110,54 100,54 C90,54 82,46 82,34 C82,22 88,12 100,12 Z';
const NECK = 'M92,50 L108,50 L110,62 L90,62 Z';
const HAND = 'M38,198 C34,206 36,218 42,220 C48,220 50,210 48,198 Z';
const KNEE = 'M78,282 C76,292 80,298 86,299 C92,298 96,292 95,282 Z';
const FOOT = 'M80,374 L93,374 C96,382 98,388 94,392 L78,392 C76,386 78,380 80,374 Z';
const PELVIS = 'M80,166 L120,166 L124,188 L100,200 L76,188 Z';

const DELT = 'M74,66 C60,64 47,72 45,90 C44,98 48,104 53,104 C57,94 64,86 76,80 Z';
const UPPER_ARM = 'M46,106 C42,118 42,130 46,140 C51,144 57,142 59,136 C61,124 60,114 56,104 Z';
const FOREARM = 'M45,145 C38,158 35,176 37,194 L49,196 C54,180 58,162 58,146 Z';

const FRONT: Part[] = [
  { group: null, d: HEAD },
  { group: null, d: NECK },
  { group: null, d: PELVIS },
  { group: null, d: HAND, mirror: true },
  { group: null, d: KNEE, mirror: true },
  { group: null, d: FOOT, mirror: true },
  { group: 'traps', d: 'M91,56 C84,62 78,66 73,68 L92,70 Z', mirror: true },
  { group: 'shoulders', d: DELT, mirror: true },
  { group: 'chest', d: 'M99,72 L78,72 C70,78 68,92 72,104 C80,112 92,112 99,108 Z', mirror: true },
  { group: 'biceps', d: UPPER_ARM, mirror: true },
  { group: 'forearms', d: FOREARM, mirror: true },
  // Obliques are folded into the abdominal group.
  { group: 'abs', d: 'M74,110 C76,126 78,146 80,164 L86,164 L85,112 Z', mirror: true },
  { group: 'abs', d: 'M87,112 h11 a2,2 0 0 1 2,2 v12 h-15 v-12 a2,2 0 0 1 2,-2 Z', mirror: true },
  { group: 'abs', d: 'M85,129 h15 v15 h-15 Z', mirror: true },
  { group: 'abs', d: 'M85,147 h15 v17 h-15 Z', mirror: true },
  { group: 'quads', d: 'M77,190 C70,212 70,250 77,280 C83,284 91,284 96,280 C100,252 100,218 98,200 Z', mirror: true },
  { group: 'calves', d: 'M79,301 C74,320 76,350 81,372 L92,372 C96,350 96,320 94,301 Z', mirror: true },
];

const BACK: Part[] = [
  { group: null, d: HEAD },
  { group: null, d: NECK },
  { group: null, d: HAND, mirror: true },
  { group: null, d: KNEE, mirror: true },
  { group: null, d: FOOT, mirror: true },
  { group: null, d: 'M81,352 L93,352 L93,374 L81,374 Z', mirror: true },
  { group: 'lats', d: 'M75,76 C69,94 72,124 84,156 L99,160 L99,124 L88,74 Z', mirror: true },
  // Upper back (trapezius + rhomboids) as one diamond.
  { group: 'traps', d: 'M90,54 L110,54 L127,68 L112,74 L100,120 L88,74 L73,68 Z' },
  { group: 'shoulders', d: DELT, mirror: true },
  { group: 'triceps', d: UPPER_ARM, mirror: true },
  { group: 'forearms', d: FOREARM, mirror: true },
  { group: 'lowerBack', d: 'M86,158 C92,162 108,162 114,158 L117,182 C108,186 92,186 83,182 Z' },
  { group: 'glutes', d: 'M80,184 C72,196 74,214 88,219 C96,220 99,212 99,200 L99,188 Z', mirror: true },
  { group: 'hamstrings', d: 'M77,222 C72,242 74,264 78,280 L96,280 C99,262 99,240 98,222 Z', mirror: true },
  { group: 'calves', d: 'M79,300 C70,316 72,336 80,350 C84,358 91,358 94,350 C98,332 98,314 94,300 Z', mirror: true },
];

interface Props {
  colorFor: (g: MuscleGroupId) => string;
  selected?: MuscleGroupId | null;
  onSelect?: (g: MuscleGroupId) => void;
}

function Figure({ parts, label, colorFor, selected, onSelect }: Props & { parts: Part[]; label: string }) {
  const render = (p: Part, key: string, mirrored: boolean) => (
    <path
      key={key}
      d={p.d}
      transform={mirrored ? 'translate(200,0) scale(-1,1)' : undefined}
      fill={p.group ? colorFor(p.group) : 'var(--body-neutral)'}
      className={p.group ? `muscle${selected === p.group ? ' selected' : ''}` : 'neutral'}
      onClick={p.group && onSelect ? () => onSelect(p.group!) : undefined}
    >
      {p.group && <title>{MUSCLE_BY_ID[p.group].name}</title>}
    </path>
  );
  return (
    <figure className="body-figure">
      <svg viewBox="20 0 160 400" role="img" aria-label={label}>
        {parts.flatMap((p, i) => [render(p, `${i}`, false), ...(p.mirror ? [render(p, `${i}m`, true)] : [])])}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function BodyMap(props: Props) {
  return (
    <div className="body-map">
      <Figure {...props} parts={FRONT} label="Face" />
      <Figure {...props} parts={BACK} label="Dos" />
    </div>
  );
}
