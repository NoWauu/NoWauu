import { useMemo, useState } from 'react';
import { BodyMap } from '../components/BodyMap';
import { RankBadge } from '../components/Rank';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import { TIERS, tierFromScore } from '../domain/ranking';
import type { MuscleGroupId } from '../domain/types';
import { VOLUME_BANDS, addDays, startOfWeek, volumeColor, weeklyVolume } from '../domain/volume';
import { useRanks } from '../hooks/useRanks';
import { useAppState } from '../storage/store';

type Mode = 'volume' | 'rank';

export function WeekPage() {
  const workouts = useAppState((s) => s.workouts);
  const { groups } = useRanks();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<Mode>('volume');
  const [selected, setSelected] = useState<MuscleGroupId | null>(null);

  const from = useMemo(() => addDays(startOfWeek(new Date()), offset * 7), [offset]);
  const to = useMemo(() => addDays(from, 7), [from]);
  const volume = useMemo(() => weeklyVolume(workouts, EXERCISE_BY_ID, from, to), [workouts, from, to]);
  const sessions = workouts.filter((w) => w.startedAt >= from.getTime() && w.startedAt < to.getTime());
  const scoreOf = (g: MuscleGroupId) => groups.find((x) => x.group === g)?.score ?? null;

  const colorFor = (g: MuscleGroupId) => {
    if (mode === 'volume') return volumeColor(volume[g]);
    const s = scoreOf(g);
    return s === null ? 'var(--muscle-idle)' : tierFromScore(s).tier.color;
  };

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const worked = MUSCLE_GROUPS.filter((m) => volume[m.id] > 0).length;

  return (
    <div className="page">
      <h1>Semaine</h1>
      <div className="row between week-nav">
        <button className="icon-btn" onClick={() => setOffset((o) => o - 1)} aria-label="Semaine précédente">
          ‹
        </button>
        <div className="center">
          <strong>{offset === 0 ? 'Cette semaine' : `${fmt(from)} – ${fmt(addDays(to, -1))}`}</strong>
          <span className="muted small block">
            {sessions.length} séance{sessions.length > 1 ? 's' : ''} · {worked}/{MUSCLE_GROUPS.length} groupes
          </span>
        </div>
        <button
          className="icon-btn"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          aria-label="Semaine suivante"
        >
          ›
        </button>
      </div>

      <div className="segmented">
        <button className={mode === 'volume' ? 'on' : ''} onClick={() => setMode('volume')}>
          Volume
        </button>
        <button className={mode === 'rank' ? 'on' : ''} onClick={() => setMode('rank')}>
          Rangs
        </button>
      </div>

      <BodyMap colorFor={colorFor} selected={selected} onSelect={(g) => setSelected(g === selected ? null : g)} />

      <div className="legend">
        {mode === 'volume'
          ? VOLUME_BANDS.map((b) => (
              <span key={b.label}>
                <span className="dot" style={{ background: b.color }} />
                {b.label}
              </span>
            ))
          : TIERS.map((t) => (
              <span key={t.id}>
                <span className="dot" style={{ background: t.color }} />
                {t.name}
              </span>
            ))}
      </div>

      {selected && (
        <div className="card highlight">
          <div className="row between">
            <strong>{MUSCLE_BY_ID[selected].name}</strong>
            <RankBadge score={scoreOf(selected)} size="sm" />
          </div>
          <p className="muted small no-margin">{formatSets(volume[selected])} séries cette semaine</p>
        </div>
      )}

      <h2>Séries par groupe</h2>
      <ul className="list compact">
        {[...MUSCLE_GROUPS]
          .sort((a, b) => volume[b.id] - volume[a.id])
          .map((m) => (
            <li key={m.id}>
              <button className="volume-row" onClick={() => setSelected(m.id)}>
                <span className="volume-name">{m.name}</span>
                <span className="bar grow">
                  <span
                    className="bar-fill"
                    style={{ width: `${Math.min(volume[m.id] / 20, 1) * 100}%`, background: volumeColor(volume[m.id]) }}
                  />
                </span>
                <span className="volume-count">{formatSets(volume[m.id])}</span>
              </button>
            </li>
          ))}
      </ul>
      <p className="muted small">
        Une série compte 1 pour les muscles principaux et ½ pour les secondaires. Repère : 10–20 séries par muscle et
        par semaine.
      </p>
    </div>
  );
}

function formatSets(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
