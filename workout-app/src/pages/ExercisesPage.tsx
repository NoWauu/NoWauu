import { ChevronLeft, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { BodyMap } from '../components/body/BodyMap';
import { ExerciseRow, useExerciseFilter } from '../components/ExercisePicker';
import { ProgressChart } from '../components/ProgressChart';
import { RankMeter, RankPill, TierEmblem } from '../components/Rank';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID } from '../domain/muscles';
import {
  TIERS,
  estimate1RM,
  exerciseHistory,
  nextTierHint,
  thresholdsFor,
  tierFromScore,
} from '../domain/ranking';
import type { Exercise, Profile } from '../domain/types';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';
import { formatDay, formatNumber } from '../lib/format';
import { useAppState } from '../storage/store';

export function ExercisesPage() {
  const { sections, count, controls } = useExerciseFilter();
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const { best } = useRanks();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{count} exercices</span>
        <h1>Exercices</h1>
      </header>
      <div className="sticky-filters">{controls}</div>
      {sections.map((s) => (
        <section key={s.key} className="list-section">
          <h2 className="section-label">{s.title}</h2>
          <div className="list-group">
            {s.items.map((e) => {
              const score = best.get(e.id)?.score;
              return (
                <ExerciseRow
                  key={e.id}
                  ex={e}
                  sex={sex}
                  onClick={() => navigate(`/exos/${e.id}`)}
                  right={score !== undefined ? <RankPill score={score} size="sm" /> : undefined}
                />
              );
            })}
          </div>
        </section>
      ))}
      {!sections.length && <p className="empty">Aucun exercice ne correspond.</p>}
    </div>
  );
}

function unitOf(ex: Exercise) {
  return ex.scoring.kind === 'reps' ? (ex.scoring.unit === 'sec' ? 's' : 'reps') : 'kg';
}

export function ExerciseDetailPage({ id }: { id: string }) {
  const ex = EXERCISE_BY_ID[id];
  const profile = useAppState((s) => s.profile);
  const workouts = useAppState((s) => s.workouts);
  const { best } = useRanks();
  const sex = profile?.sex ?? 'M';
  const history = useMemo(() => (ex ? exerciseHistory(ex, workouts, sex) : []), [ex, workouts, sex]);

  if (!ex || !profile) {
    return (
      <div className="page">
        <p className="empty">Exercice introuvable.</p>
      </div>
    );
  }

  const mine = best.get(ex.id);
  const unit = unitOf(ex);
  const thresholds = thresholdsFor(ex, profile.sex).map((t) => (ex.scoring.kind === 'reps' ? t : t * profile.bodyweightKg));
  const record = history.reduce<(typeof history)[number] | null>((a, p) => (!a || p.value > a.value ? p : a), null);

  return (
    <div className="page">
      <button className="back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/exos'))}>
        <ChevronLeft size={20} /> Retour
      </button>

      <header className="page-head">
        <span className="eyebrow">{ex.equipment}{ex.perSide ? ' · charge par côté' : ''}</span>
        <h1>{ex.name}</h1>
      </header>

      <section className="card ex-hero">
        <BodyMap
          sex={profile.sex}
          captions
          fill={(g) => (ex.primary.includes(g) ? 'var(--accent)' : ex.secondary.includes(g) ? 'var(--accent-soft-solid)' : null)}
        />
        <div className="muscle-legend">
          <span className="key">
            <span className="swatch" style={{ background: 'var(--accent)' }} />
            Principaux
          </span>
          {ex.primary.map((g) => (
            <span key={g} className="tag tag-strong">{MUSCLE_BY_ID[g].name}</span>
          ))}
        </div>
        {ex.secondary.length > 0 && (
          <div className="muscle-legend">
            <span className="key">
              <span className="swatch" style={{ background: 'var(--accent-soft-solid)' }} />
              Secondaires
            </span>
            {ex.secondary.map((g) => (
              <span key={g} className="tag">{MUSCLE_BY_ID[g].name}</span>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <RankMeter
          label="Ton rang"
          score={mine?.score ?? null}
          emblemSize={56}
          hint={mine ? nextTierHint(ex, mine.value, profile.bodyweightKg, profile.sex) : null}
        />
        {record && (
          <dl className="facts">
            <div>
              <dt>Record</dt>
              <dd className="tabular">
                {ex.scoring.kind === 'reps'
                  ? `${record.bestSet.reps} ${unit}`
                  : `${formatNumber(record.bestSet.weightKg)} × ${record.bestSet.reps}`}
              </dd>
            </div>
            {ex.scoring.kind === 'load' && (
              <div>
                <dt>1RM estimé</dt>
                <dd className="tabular">{formatNumber(Math.round(record.value * 10) / 10)} kg</dd>
              </div>
            )}
            <div>
              <dt>Séances</dt>
              <dd className="tabular">{history.length}</dd>
            </div>
          </dl>
        )}
      </section>

      {history.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Progression</h2>
            <span className="text-3 small">{ex.scoring.kind === 'load' ? '1RM estimé' : 'Meilleure série'}</span>
          </div>
          <ProgressChart points={history} thresholds={thresholds} unit={unit} />
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Exécution</h2>
        <ol className="steps">
          {ex.steps.map((s, i) => (
            <li key={i}>
              <span className="step-num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {ex.tips.length > 0 && (
          <div className="tips">
            <Lightbulb size={18} />
            <ul>
              {ex.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Paliers</h2>
          <span className="text-3 small">
            {profile.bodyweightKg} kg · {profile.sex === 'M' ? 'H' : 'F'}
          </span>
        </div>
        <StandardsTable ex={ex} profile={profile} current={mine?.score ?? null} />
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="section-title">Historique</h2>
          <div className="list-group">
            {[...history].reverse().slice(0, 12).map((p) => (
              <div key={p.workoutId} className="detail-row">
                <span className="ex-row-text">
                  <span className="ex-row-name">{formatDay(p.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="ex-row-meta tabular">
                    {ex.scoring.kind === 'reps'
                      ? `${p.bestSet.reps} ${unit}`
                      : `${formatNumber(p.bestSet.weightKg)} × ${p.bestSet.reps} · 1RM ${formatNumber(Math.round(p.value))} kg`}
                  </span>
                </span>
                <RankPill score={p.score} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** What each tier means concretely for *your* bodyweight; your tier is highlighted. */
function StandardsTable({ ex, profile, current }: { ex: Exercise; profile: Profile; current: number | null }) {
  const t = thresholdsFor(ex, profile.sex);
  const bw = profile.bodyweightKg;
  const s = ex.scoring;
  const currentIndex = current === null ? -1 : tierFromScore(current).index;

  const describe = (ratio: number) => {
    if (s.kind === 'reps') return { main: `${Math.ceil(ratio)} ${s.unit === 'sec' ? 's' : 'reps'}`, sub: 'en une série' };
    const f = s.bodyweightFactor ?? 0;
    const total = ratio * bw;
    if (f > 0) {
      const added = total - f * bw;
      if (added <= 0) {
        const reps = Math.max(1, Math.ceil(30 * (total / (f * bw) - 1)));
        return { main: `${reps} reps`, sub: 'au poids du corps' };
      }
      return { main: `+${Math.round(added)} kg`, sub: 'de lest (1RM)' };
    }
    return {
      main: `${Math.round(total)} kg`,
      sub: `1RM${ex.perSide ? ' / côté' : ''} · ≈ ${Math.round(total / estimate1RM(1, 8))} kg × 8`,
    };
  };

  return (
    <div className="standards">
      {TIERS.map((tier, i) => {
        const d = i === 0 ? { main: 'Départ', sub: 'dès la première série' } : describe(t[i - 1]);
        return (
          <div key={tier.id} className={`standard-row ${i === currentIndex ? 'is-current' : ''}`}>
            <TierEmblem score={i + 0.5} size={30} />
            <span className="standard-name">
              {tier.name}
              {i === currentIndex && <span className="you-are-here">Toi</span>}
            </span>
            <span className="standard-value">
              <strong className="tabular">{d.main}</strong>
              <span className="text-3 small">{d.sub}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
