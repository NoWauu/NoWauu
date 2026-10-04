import { tierFromScore } from '../domain/ranking';

export function RankBadge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null) return <span className={`rank-badge ${size} unrated`}>Non classé</span>;
  const { tier } = tierFromScore(score);
  return (
    <span className={`rank-badge ${size}`} style={{ '--tier': tier.color } as React.CSSProperties}>
      {tier.name}
    </span>
  );
}

/** Badge + bar showing progress inside the current tier. */
export function RankMeter({ score, hint }: { score: number | null; hint?: string | null }) {
  if (score === null) return <RankBadge score={null} />;
  const { tier, progress, index } = tierFromScore(score);
  return (
    <div className="rank-meter">
      <div className="rank-meter-head">
        <RankBadge score={score} />
        <span className="muted small">{index === 5 && progress >= 1 ? 'Max' : `${Math.round(progress * 100)} %`}</span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${progress * 100}%`, background: tier.color }} />
      </div>
      {hint && <div className="muted small">Prochain rang : {hint}</div>}
    </div>
  );
}
