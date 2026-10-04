import { useId } from 'react';
import { TIERS, tierFromScore } from '../domain/ranking';

// Rank emblems: a hexagonal badge per tier. Colour gives the identity, and a
// glyph gives a second, colour-independent cue (ring → 1/2/3 chevrons → flame
// → crown), so tiers stay distinguishable for colour-blind users.

const HEX = 'M32 2.5 L58 17.5 V46.5 L32 61.5 L6 46.5 V17.5 Z';
const HEX_INNER = 'M32 8.5 L52.5 20.3 V43.7 L32 55.5 L11.5 43.7 V20.3 Z';

const CHEVRONS = [[], [32], [28, 37], [24, 32, 40]];
const FLAME =
  'M32 15.5c3.2 5.4 9.6 9.4 9.6 18.4 0 7.3-4.3 12.6-9.6 12.6s-9.6-5-9.6-11.4c0-4.4 2.3-7.3 4.6-9.7.2 3.1 1.6 5.6 3.9 6.6-1.3-5.3-.5-11.3 1.1-16.5Z';
const CROWN = 'M18.5 41 16.5 23.5l8.7 7.2L32 19.5l6.8 11.2 8.7-7.2L45.5 41Z';

function Glyph({ index, color }: { index: number; color: string }) {
  if (index === 0) return <circle cx="32" cy="32" r="6.5" fill="none" stroke={color} strokeWidth="4" />;
  if (index <= 3) {
    return (
      <g fill="none" stroke={color} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        {CHEVRONS[index].map((y) => (
          <path key={y} d={`M21.5 ${y + 4} L32 ${y - 3.5} L42.5 ${y + 4}`} />
        ))}
      </g>
    );
  }
  if (index === 4) return <path d={FLAME} fill={color} />;
  return (
    <g fill={color}>
      <path d={CROWN} />
      <rect x="18.5" y="43.5" width="27" height="4" rx="2" />
    </g>
  );
}

export function TierEmblem({ score, size = 28 }: { score: number | null; size?: number }) {
  const id = useId();
  if (score === null) {
    return (
      <svg className="emblem is-unrated" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path d={HEX} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5 5" />
      </svg>
    );
  }
  const { index, tier } = tierFromScore(score);
  const ink = index >= 3 ? '#20140a' : '#ffffff';
  return (
    <svg className={`emblem tier-${index}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tier.light} />
          <stop offset="0.55" stopColor={tier.color} />
          <stop offset="1" stopColor={tier.dark} />
        </linearGradient>
      </defs>
      <path d={HEX} fill={`url(#${id})`} />
      <path d={HEX_INNER} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
      <Glyph index={index} color={ink} />
    </svg>
  );
}

/** Compact "emblem + name" chip. The name stays in text colour, never tier colour. */
export function RankPill({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  const name = score === null ? 'Non classé' : tierFromScore(score).tier.name;
  return (
    <span className={`rank-pill rank-pill-${size} ${score === null ? 'is-unrated' : ''}`}>
      <TierEmblem score={score} size={size === 'sm' ? 16 : 20} />
      {name}
    </span>
  );
}

/** Emblem, tier name, progress inside the tier and what the next tier needs. */
export function RankMeter({
  score,
  hint,
  emblemSize = 48,
  label,
}: {
  score: number | null;
  hint?: string | null;
  emblemSize?: number;
  label?: string;
}) {
  if (score === null) {
    return (
      <div className="rank-meter">
        <TierEmblem score={null} size={emblemSize} />
        <div className="rank-meter-body">
          {label && <span className="eyebrow">{label}</span>}
          <strong className="rank-meter-name">Non classé</strong>
          <span className="text-3 small">Valide une série pour obtenir un rang.</span>
        </div>
      </div>
    );
  }
  const { tier, index, progress } = tierFromScore(score);
  const next = TIERS[index + 1];
  const maxed = !next && progress >= 1;
  return (
    <div className="rank-meter">
      <TierEmblem score={score} size={emblemSize} />
      <div className="rank-meter-body">
        {label && <span className="eyebrow">{label}</span>}
        <div className="row between baseline">
          <strong className="rank-meter-name">{tier.name}</strong>
          <span className="text-3 small tabular">{maxed ? 'Max' : `${Math.round(progress * 100)} %`}</span>
        </div>
        <div className="meter" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="meter-fill" style={{ width: `${progress * 100}%`, background: tier.color }} />
        </div>
        {next && (
          <span className="text-3 small">
            Prochain : <span className="text-2">{next.name}</span>
            {hint && <> · {hint}</>}
          </span>
        )}
      </div>
    </div>
  );
}
