import { BodyMap } from '../components/BodyMap';
import { muscleList, useExerciseFilter } from '../components/ExercisePicker';
import { RankBadge, RankMeter } from '../components/Rank';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID } from '../domain/muscles';
import { TIERS, estimate1RM, nextTierHint, scoreSets, thresholdsFor } from '../domain/ranking';
import type { Exercise, Profile } from '../domain/types';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';
import { useAppState } from '../storage/store';

export function ExercisesPage() {
  const { list, controls } = useExerciseFilter();
  const { best } = useRanks();
  return (
    <div className="page">
      <h1>Exercices</h1>
      {controls}
      <ul className="list">
        {list.map((e) => (
          <li key={e.id}>
            <button className="list-item" onClick={() => navigate(`/exos/${e.id}`)}>
              <span className="grow">
                <strong>{e.name}</strong>
                <span className="muted small block">
                  {e.equipment} · {muscleList(e)}
                </span>
              </span>
              <RankBadge score={best.get(e.id)?.score ?? null} size="sm" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExerciseDetailPage({ id }: { id: string }) {
  const ex = EXERCISE_BY_ID[id];
  const profile = useAppState((s) => s.profile);
  const workouts = useAppState((s) => s.workouts);
  const { best } = useRanks();
  if (!ex || !profile) return <div className="page">Exercice introuvable.</div>;

  const mine = best.get(ex.id);
  const history = workouts
    .flatMap((w) =>
      w.exercises
        .filter((l) => l.exerciseId === ex.id)
        .map((l) => ({ w, r: scoreSets(ex, l.sets, w.bodyweightKg, w.sex) })),
    )
    .reverse()
    .slice(0, 10);

  return (
    <div className="page">
      <button className="back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/exos'))}>
        ‹ Retour
      </button>
      <h1>{ex.name}</h1>
      <p className="muted no-margin">{ex.equipment}{ex.perSide ? ' · poids par côté' : ''}</p>

      <section className="card">
        <h2>Ton rang</h2>
        <RankMeter
          score={mine?.score ?? null}
          hint={mine ? nextTierHint(ex, mine.value, profile.bodyweightKg, profile.sex) : null}
        />
      </section>

      <section className="card">
        <h2>Muscles travaillés</h2>
        <div className="muscle-tags">
          {ex.primary.map((g) => (
            <span key={g} className="tag primary">{MUSCLE_BY_ID[g].name}</span>
          ))}
          {ex.secondary.map((g) => (
            <span key={g} className="tag secondary">{MUSCLE_BY_ID[g].name}</span>
          ))}
        </div>
        <BodyMap
          colorFor={(g) =>
            ex.primary.includes(g) ? 'var(--accent)' : ex.secondary.includes(g) ? 'var(--accent-soft)' : 'var(--muscle-idle)'
          }
        />
      </section>

      <section className="card">
        <h2>Comment le faire</h2>
        <ol className="steps">
          {ex.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {ex.tips.length > 0 && (
          <>
            <h3>Conseils</h3>
            <ul className="tips">
              {ex.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Paliers</h2>
        <StandardsTable ex={ex} profile={profile} />
      </section>

      {history.length > 0 && (
        <section className="card">
          <h2>Historique</h2>
          <ul className="list compact">
            {history.map(({ w, r }) => (
              <li key={w.id} className="row between">
                <span>
                  {new Date(w.startedAt).toLocaleDateString('fr-FR')}
                  {r.bestSet && (
                    <span className="muted small block">
                      {ex.scoring.kind === 'reps'
                        ? `${r.bestSet.reps} ${ex.scoring.unit === 'sec' ? 's' : 'reps'}`
                        : `${r.bestSet.weightKg} kg × ${r.bestSet.reps}`}
                    </span>
                  )}
                </span>
                <RankBadge score={r.score} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** What each tier means concretely for *your* bodyweight. */
function StandardsTable({ ex, profile }: { ex: Exercise; profile: Profile }) {
  const t = thresholdsFor(ex, profile.sex);
  const bw = profile.bodyweightKg;
  const s = ex.scoring;

  const describe = (ratio: number) => {
    if (s.kind === 'reps') return `${Math.ceil(ratio)} ${s.unit === 'sec' ? 's' : 'reps'}`;
    const f = s.bodyweightFactor ?? 0;
    const total = ratio * bw;
    if (f > 0) {
      const added = total - f * bw;
      if (added <= 0) {
        // Express it as reps at bodyweight via inverse Epley.
        const reps = Math.max(1, Math.ceil(30 * (total / (f * bw) - 1)));
        return `${reps} reps au poids du corps`;
      }
      return `1RM avec +${Math.round(added)} kg de lest`;
    }
    return `1RM ${Math.round(total)} kg${ex.perSide ? ' / côté' : ''} (≈ ${Math.round(total / estimate1RM(1, 8))} kg × 8)`;
  };

  return (
    <>
      <table className="standards">
        <tbody>
          {TIERS.slice(1).map((tier, i) => (
            <tr key={tier.id}>
              <td>
                <span className="dot" style={{ background: tier.color }} />
                {tier.name}
              </td>
              <td>{describe(t[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        Calculé pour {bw} kg ({profile.sex === 'M' ? 'homme' : 'femme'}).{' '}
        {s.kind === 'load' ? 'Basé sur le 1RM estimé de ta meilleure série (formule d’Epley).' : 'Basé sur ta meilleure série.'}
      </p>
    </>
  );
}
