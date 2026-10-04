import { ChevronLeft, ChevronRight, CircleCheck, Info, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BodyMap } from '../components/body/BodyMap';
import { RankPill } from '../components/Rank';
import { WeekStrip } from '../components/WeekStrip';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import { isWorkingSet } from '../domain/ranking';
import type { MuscleGroupId, Workout } from '../domain/types';
import { SECONDARY_WEIGHT, TARGET_SETS, VOLUME_BANDS, addDays, startOfWeek, volumeColor, volumeOf, workoutsBetween } from '../domain/volume';
import { useRanks } from '../hooks/useRanks';
import { formatNumber } from '../lib/format';
import { useAppState } from '../storage/store';

const BAR_MAX = 25;

export function BodyPage() {
  const workouts = useAppState((s) => s.workouts);
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<MuscleGroupId | null>(null);

  const from = useMemo(() => addDays(startOfWeek(new Date()), offset * 7), [offset]);
  const to = useMemo(() => addDays(from, 7), [from]);
  const week = useMemo(() => workoutsBetween(workouts, from, to), [workouts, from, to]);
  const volume = useMemo(() => volumeOf(week, EXERCISE_BY_ID), [week]);
  const worked = MUSCLE_GROUPS.filter((m) => volume[m.id] > 0).length;

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const label = offset === 0 ? 'Cette semaine' : offset === -1 ? 'Semaine dernière' : `${fmt(from)} – ${fmt(addDays(to, -1))}`;

  const select = (g: MuscleGroupId) => setSelected((s) => (s === g ? null : g));

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Volume d’entraînement</span>
        <h1>Corps</h1>
      </header>

      <div className="week-nav">
        <button className="icon-btn" onClick={() => setOffset((o) => o - 1)} aria-label="Semaine précédente">
          <ChevronLeft size={22} />
        </button>
        <div className="week-nav-label">
          <strong>{label}</strong>
          <span className="text-3 small">
            {week.length} séance{week.length > 1 ? 's' : ''} · {worked}/{MUSCLE_GROUPS.length} muscles
          </span>
        </div>
        <button
          className="icon-btn"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          aria-label="Semaine suivante"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <section className="card body-card">
        <WeekStrip weekStart={from} workouts={week} />
        <BodyMap sex={sex} captions fill={(g) => volumeColor(volume[g])} selected={selected} onSelect={select} />
        <VolumeLegend />
        {selected ? (
          <MuscleDetail group={selected} sets={volume[selected]} week={week} onClose={() => setSelected(null)} />
        ) : (
          <p className="hint">
            <Info size={14} /> Touche un muscle pour voir le détail.
          </p>
        )}
      </section>

      <section>
        <h2 className="section-title">Séries par muscle</h2>
        <div className="card volume-list">
          {MUSCLE_GROUPS.map((m) => {
            const v = volume[m.id];
            return (
              <button
                key={m.id}
                className={`volume-row ${selected === m.id ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelected(m.id);
                  document.querySelector('.body-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="volume-name">{m.name}</span>
                <span className="volume-track">
                  <span
                    className="volume-target"
                    style={{
                      left: `${(TARGET_SETS.min / BAR_MAX) * 100}%`,
                      width: `${((TARGET_SETS.max - TARGET_SETS.min) / BAR_MAX) * 100}%`,
                    }}
                  />
                  {v > 0 && (
                    <span
                      className="volume-fill"
                      style={{ width: `${Math.min(v / BAR_MAX, 1) * 100}%`, background: volumeColor(v)! }}
                    />
                  )}
                </span>
                <span className="volume-count tabular">{formatNumber(v)}</span>
              </button>
            );
          })}
        </div>
        <p className="footnote">
          Zone claire : la cible de {TARGET_SETS.min} à {TARGET_SETS.max} séries par semaine. Une série compte 1 pour les
          muscles principaux et ½ pour les secondaires ; les échauffements ne comptent pas.
        </p>
      </section>
    </div>
  );
}

function VolumeLegend() {
  return (
    <div className="ramp-legend" aria-label="Légende : séries par semaine">
      <div className="ramp">
        <span style={{ background: 'var(--muscle-idle)' }} />
        {VOLUME_BANDS.map((b) => (
          <span key={b.label} style={{ background: b.color }} />
        ))}
      </div>
      <div className="ramp-labels">
        <span>0</span>
        {VOLUME_BANDS.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
      <span className="ramp-caption">séries / semaine</span>
    </div>
  );
}

function MuscleDetail({ group, sets, week, onClose }: { group: MuscleGroupId; sets: number; week: Workout[]; onClose: () => void }) {
  const { groups } = useRanks();
  const score = groups.find((g) => g.group === group)?.score ?? null;

  // Exercises of the week that hit this muscle, with their weighted sets.
  const rows = new Map<string, { sets: number; primary: boolean }>();
  for (const w of week) {
    for (const l of w.exercises) {
      const ex = EXERCISE_BY_ID[l.exerciseId];
      if (!ex) continue;
      const primary = ex.primary.includes(group);
      if (!primary && !ex.secondary.includes(group)) continue;
      const n = l.sets.filter(isWorkingSet).length * (primary ? 1 : SECONDARY_WEIGHT);
      const cur = rows.get(ex.id) ?? { sets: 0, primary };
      rows.set(ex.id, { sets: cur.sets + n, primary });
    }
  }

  const status =
    sets === 0
      ? null
      : sets < TARGET_SETS.min
        ? { icon: <TrendingUp size={14} />, text: `${formatNumber(TARGET_SETS.min - sets)} séries pour atteindre la cible` }
        : sets <= TARGET_SETS.max
          ? { icon: <CircleCheck size={14} />, text: 'Dans la cible' }
          : { icon: <Info size={14} />, text: 'Au-dessus de la cible : pense à la récupération' };

  return (
    <div className="muscle-detail">
      <div className="row between">
        <div>
          <strong className="muscle-detail-name">{MUSCLE_BY_ID[group].name}</strong>
          <span className="text-2 small block">
            <strong className="tabular text-1">{formatNumber(sets)}</strong> séries cette semaine
          </span>
        </div>
        <div className="row gap-sm">
          <RankPill score={score} size="sm" />
          <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Fermer le détail">
            <X size={18} />
          </button>
        </div>
      </div>
      {status && (
        <span className="status-line">
          {status.icon}
          {status.text}
        </span>
      )}
      {rows.size > 0 && (
        <ul className="muscle-detail-list">
          {[...rows].map(([id, r]) => (
            <li key={id}>
              <span>{EXERCISE_BY_ID[id].name}</span>
              <span className="text-3 small tabular">
                {formatNumber(r.sets)} {r.primary ? '' : '(secondaire)'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
