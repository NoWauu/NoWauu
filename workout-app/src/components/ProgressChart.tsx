import { useState } from 'react';
import { TIERS, type HistoryPoint } from '../domain/ranking';
import { formatDay, formatNumber } from '../lib/format';
import { useWidth } from '../lib/hooks';
import { RankPill } from './Rank';

// Line chart of an exercise's best performance per session, drawn over faint
// tier bands so you see the line climb through the ranks. Single series → no
// legend box (the card title names it); tooltip enhances, the history list
// below the chart is the table view.

const H = 210;
const M = { l: 44, r: 18, t: 18, b: 28 };

function niceStep(range: number, count: number) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

interface Props {
  points: HistoryPoint[];
  /** Tier entry thresholds in display units (kg of 1RM, reps or seconds). */
  thresholds: number[];
  unit: string;
}

export function ProgressChart({ points, thresholds, unit }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = width;

  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  // Always show the next tier to reach, and the one you're in.
  hi = Math.max(hi, thresholds.find((t) => t > hi) ?? hi);
  lo = Math.min(lo, [...thresholds].reverse().find((t) => t <= lo) ?? 0);
  const pad = (hi - lo) * 0.08 || Math.max(hi * 0.1, 1);
  lo = Math.max(0, lo - pad);
  hi += pad;

  const t0 = points[0].date;
  const t1 = points[points.length - 1].date;
  const innerW = Math.max(0, W - M.l - M.r);
  const innerH = H - M.t - M.b;
  const x = (t: number) => (t1 === t0 ? M.l + innerW / 2 : M.l + ((t - t0) / (t1 - t0)) * innerW);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * innerH;

  const step = niceStep(hi - lo, 4);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  const bands = TIERS.map((tier, i) => {
    const from = Math.max(i ? thresholds[i - 1] : 0, lo);
    const to = Math.min(i < TIERS.length - 1 ? thresholds[i] : Infinity, hi);
    return { tier, from, to };
  }).filter((b) => b.to > b.from);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  const fmt = (v: number) => `${formatNumber(Math.round(v * 10) / 10)} ${unit}`;

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    setHover(best);
  };

  const h = hover !== null ? points[hover] : null;

  return (
    <div
      className="chart"
      ref={ref}
      tabIndex={0}
      aria-label={`Progression : ${points.length} séances, dernière valeur ${fmt(last.value)}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setHover((i) => Math.max(0, (i ?? points.length) - 1));
        if (e.key === 'ArrowRight') setHover((i) => Math.min(points.length - 1, (i ?? -1) + 1));
        if (e.key === 'Escape') setHover(null);
      }}
    >
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-hidden>
          {bands.map(({ tier, from, to }) => {
            const top = y(to);
            const height = y(from) - top;
            return (
              <g key={tier.id}>
                <rect x={M.l} y={top} width={innerW} height={height} fill={tier.color} opacity={0.1} />
                <line x1={M.l} x2={M.l + innerW} y1={y(from)} y2={y(from)} stroke={tier.color} strokeOpacity={0.35} />
                {height >= 18 && (
                  <text className="chart-band-label" x={M.l + innerW - 6} y={top + 13} textAnchor="end">
                    {tier.name}
                  </text>
                )}
              </g>
            );
          })}
          {ticks.map((v) => (
            <text key={v} className="chart-tick" x={M.l - 8} y={y(v) + 4} textAnchor="end">
              {formatNumber(v)}
            </text>
          ))}
          <text className="chart-tick" x={M.l} y={H - 8}>
            {formatDay(t0, { day: 'numeric', month: 'short' })}
          </text>
          {t1 !== t0 && (
            <text className="chart-tick" x={M.l + innerW} y={H - 8} textAnchor="end">
              {formatDay(t1, { day: 'numeric', month: 'short' })}
            </text>
          )}
          {h && <line className="chart-crosshair" x1={x(h.date)} x2={x(h.date)} y1={M.t} y2={M.t + innerH} />}
          <path d={line} className="chart-line" />
          {points.map((p, i) => (
            <circle key={p.workoutId} className="chart-dot" cx={x(p.date)} cy={y(p.value)} r={hover === i ? 6 : 4} />
          ))}
          {!h && (
            <text
              className="chart-end-label"
              x={x(last.date)}
              y={y(last.value) - 12}
              textAnchor={x(last.date) > W - 60 ? 'end' : 'middle'}
            >
              {fmt(last.value)}
            </text>
          )}
          <rect
            x={M.l - 10}
            y={0}
            width={innerW + 20}
            height={H}
            fill="transparent"
            onPointerDown={(e) => pick(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect())}
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect())}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          />
        </svg>
      )}
      {h && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(x(h.date), 70), W - 70), top: Math.max(y(h.value) - 78, 0) }}
        >
          <strong className="tabular">{fmt(h.value)}</strong>
          <span className="text-3 small">{formatDay(h.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <RankPill score={h.score} size="sm" />
        </div>
      )}
    </div>
  );
}
