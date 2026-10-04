import { useEffect, useState } from 'react';
import { ExercisePicker, muscleList } from '../components/ExercisePicker';
import { RankBadge, RankMeter } from '../components/Rank';
import { EXERCISE_BY_ID } from '../data/exercises';
import { estimate1RM, nextTierHint, scoreSets, tierFromScore } from '../domain/ranking';
import type { ExerciseLog, Workout } from '../domain/types';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';
import * as A from '../storage/actions';
import { useAppState } from '../storage/store';

export function WorkoutPage() {
  const active = useAppState((s) => s.active);
  return active ? <ActiveWorkout workout={active} /> : <WorkoutHome />;
}

// ------------------------------------------------------------------ Home

function WorkoutHome() {
  const workouts = useAppState((s) => s.workouts);
  const recent = [...workouts].reverse().slice(0, 15);
  return (
    <div className="page">
      <h1>Séance</h1>
      <button className="btn primary big" onClick={A.startWorkout}>
        Démarrer une séance
      </button>
      <h2>Historique</h2>
      {!recent.length && <p className="muted">Aucune séance enregistrée pour l’instant.</p>}
      <ul className="list">
        {recent.map((w) => (
          <HistoryItem key={w.id} workout={w} />
        ))}
      </ul>
    </div>
  );
}

function HistoryItem({ workout: w }: { workout: Workout }) {
  const [open, setOpen] = useState(false);
  const date = new Date(w.startedAt);
  const minutes = w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60000) : null;
  const sets = w.exercises.reduce((n, l) => n + l.sets.length, 0);
  return (
    <li className="card">
      <button className="list-item flat" onClick={() => setOpen((o) => !o)}>
        <span className="grow">
          <strong>
            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </strong>
          <span className="muted small block">
            {w.exercises.length} exos · {sets} séries{minutes !== null ? ` · ${minutes} min` : ''}
          </span>
        </span>
        <span className="chev">{open ? '▾' : '›'}</span>
      </button>
      {open && (
        <div className="stack small-gap">
          {w.exercises.map((l) => {
            const ex = EXERCISE_BY_ID[l.exerciseId];
            if (!ex) return null;
            const r = scoreSets(ex, l.sets, w.bodyweightKg, w.sex);
            return (
              <div key={l.uid} className="row between">
                <span>
                  {ex.name}
                  <span className="muted small block">
                    {l.sets.map((s) => (ex.scoring.kind === 'reps' ? `${s.reps}` : `${s.weightKg}×${s.reps}`)).join(' · ')}
                  </span>
                </span>
                <RankBadge score={r.score} size="sm" />
              </div>
            );
          })}
          <button
            className="btn danger ghost small"
            onClick={() => confirm('Supprimer cette séance ?') && A.deleteWorkout(w.id)}
          >
            Supprimer la séance
          </button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- Active

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  const [picking, setPicking] = useState(false);
  const elapsed = useElapsed(workout.startedAt);

  const finish = () => {
    const pending = workout.exercises.some((l) => l.sets.some((s) => !s.done));
    if (pending && !confirm('Certaines séries ne sont pas validées et seront ignorées. Terminer ?')) return;
    A.finishWorkout();
  };

  return (
    <div className="page">
      <div className="row between sticky-head">
        <div>
          <h1 className="no-margin">Séance en cours</h1>
          <span className="muted">⏱ {elapsed}</span>
        </div>
        <button className="btn primary" onClick={finish}>
          Fin de séance
        </button>
      </div>

      {workout.exercises.map((log) => (
        <ExerciseBlock key={log.uid} log={log} workout={workout} />
      ))}

      <button className="btn outline big" onClick={() => setPicking(true)}>
        + Ajouter un exercice
      </button>
      <button
        className="btn danger ghost"
        onClick={() => confirm('Abandonner la séance ? Rien ne sera enregistré.') && A.cancelWorkout()}
      >
        Abandonner la séance
      </button>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(id, sets) => {
            A.addExercise(id, sets);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function num(v: string) {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function ExerciseBlock({ log, workout }: { log: ExerciseLog; workout: Workout }) {
  const ex = EXERCISE_BY_ID[log.exerciseId];
  const { best } = useRanks();
  if (!ex) return null;

  const s = ex.scoring;
  const isReps = s.kind === 'reps';
  const weightLabel = s.kind === 'load' && s.bodyweightFactor ? 'Lest kg' : ex.perSide ? 'kg / côté' : 'kg';
  const repsLabel = isReps && s.unit === 'sec' ? 'Sec' : 'Reps';
  const finished = !!log.finishedAt;
  const doneCount = log.sets.filter((x) => x.done).length;

  return (
    <section className={`card exercise-block ${finished ? 'finished' : ''}`}>
      <div className="row between">
        <button className="link-title" onClick={() => navigate(`/exos/${ex.id}`)}>
          {ex.name}
        </button>
        <RankBadge score={best.get(ex.id)?.score ?? null} size="sm" />
      </div>
      <p className="muted small no-margin">{muscleList(ex)}</p>

      {finished ? (
        <ExerciseResultCard log={log} workout={workout} />
      ) : (
        <>
          <div className={`set-grid ${isReps ? 'no-weight' : ''}`}>
            <span className="muted small">Série</span>
            {!isReps && <span className="muted small">{weightLabel}</span>}
            <span className="muted small">{repsLabel}</span>
            <span />
            <span />
            {log.sets.map((set, i) => (
              <SetRow key={i} logUid={log.uid} index={i} set={set} isReps={isReps} />
            ))}
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => A.addSet(log.uid)}>
              + Série
            </button>
            <button
              className="btn primary grow"
              disabled={doneCount === 0}
              onClick={() => A.finishExercise(log.uid)}
            >
              Terminer l’exo
            </button>
          </div>
          <button
            className="btn danger ghost small"
            onClick={() => confirm(`Retirer ${ex.name} ?`) && A.removeExercise(log.uid)}
          >
            Retirer l’exercice
          </button>
        </>
      )}
    </section>
  );
}

function SetRow({
  logUid,
  index,
  set,
  isReps,
}: {
  logUid: string;
  index: number;
  set: ExerciseLog['sets'][number];
  isReps: boolean;
}) {
  // Local text state so typing "62," or clearing the field doesn't fight the number parser.
  const [w, setW] = useState(String(set.weightKg));
  const [r, setR] = useState(String(set.reps));
  useEffect(() => setW(String(set.weightKg)), [set.weightKg]);
  useEffect(() => setR(String(set.reps)), [set.reps]);

  return (
    <>
      <span className={`set-index ${set.done ? 'done' : ''}`}>{index + 1}</span>
      {!isReps && (
        <input
          inputMode="decimal"
          value={w}
          onChange={(e) => setW(e.target.value)}
          onBlur={() => A.updateSet(logUid, index, { weightKg: num(w) })}
          onFocus={(e) => e.target.select()}
        />
      )}
      <input
        inputMode="numeric"
        value={r}
        onChange={(e) => setR(e.target.value)}
        onBlur={() => A.updateSet(logUid, index, { reps: Math.round(num(r)) })}
        onFocus={(e) => e.target.select()}
      />
      <button
        className={`check ${set.done ? 'on' : ''}`}
        aria-label="Valider la série"
        onClick={() =>
          A.updateSet(logUid, index, { done: !set.done, weightKg: num(w), reps: Math.round(num(r)) })
        }
      >
        ✓
      </button>
      <button className="icon-btn" aria-label="Supprimer la série" onClick={() => A.removeSet(logUid, index)}>
        ✕
      </button>
    </>
  );
}

/** Shown when "Terminer l'exo" is tapped: the rank earned in this block. */
function ExerciseResultCard({ log, workout }: { log: ExerciseLog; workout: Workout }) {
  const ex = EXERCISE_BY_ID[log.exerciseId];
  const { best } = useRanks();
  const result = scoreSets(ex, log.sets, workout.bodyweightKg, workout.sex);
  const previous = best.get(ex.id);
  const isPR = !previous || result.score > previous.score + 1e-9;
  const tierUp = previous && tierFromScore(result.score).index > tierFromScore(previous.score).index;
  const b = result.bestSet;

  let detail = '';
  if (b) {
    if (ex.scoring.kind === 'reps') {
      detail = `Meilleure série : ${b.reps} ${ex.scoring.unit === 'sec' ? 's' : 'reps'}`;
    } else {
      const moved = b.weightKg + (ex.scoring.bodyweightFactor ?? 0) * workout.bodyweightKg;
      detail = `Meilleure série : ${b.weightKg} kg × ${b.reps} → 1RM estimé ${estimate1RM(moved, b.reps).toFixed(1)} kg`;
    }
  }

  return (
    <div className="result stack small-gap">
      {tierUp ? (
        <div className="banner levelup">⬆ Nouveau rang débloqué !</div>
      ) : isPR && b ? (
        <div className="banner pr">🏆 Nouveau record sur cet exo</div>
      ) : null}
      <RankMeter score={result.score} hint={nextTierHint(ex, result.value, workout.bodyweightKg, workout.sex)} />
      <p className="small no-margin">{detail}</p>
      <p className="muted small no-margin">
        {log.sets.filter((s) => s.done).length} séries validées
        {previous && ` · record précédent : ${tierFromScore(previous.score).tier.name}`}
      </p>
      <button className="btn ghost small" onClick={() => A.reopenExercise(log.uid)}>
        Modifier
      </button>
    </div>
  );
}
