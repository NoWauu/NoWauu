import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Ellipsis,
  Layers,
  Minus,
  Pencil,
  Play,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  Trophy,
  Weight,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MuscleThumb } from '../components/body/MuscleThumb';
import { ExercisePicker, muscleList } from '../components/ExercisePicker';
import { RankMeter, RankPill, TierEmblem } from '../components/Rank';
import { Sheet } from '../components/ui/Sheet';
import { Stat } from '../components/ui/Stat';
import { WeekStrip } from '../components/WeekStrip';
import { EXERCISE_BY_ID } from '../data/exercises';
import { displayValue, nextTierHint, scoreSets, tierFromScore } from '../domain/ranking';
import { formatDuration, formatTonnage, recordCounts, workoutOutcomes, workoutStats, workoutTitle } from '../domain/stats';
import type { Exercise, ExerciseLog, SetEntry, Workout } from '../domain/types';
import { addDays, startOfWeek, workoutsBetween } from '../domain/volume';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';
import { haptic, primeAudio } from '../lib/feedback';
import { formatClock, formatDay, formatNumber, parseNumber } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useWakeLock } from '../lib/useWakeLock';
import * as A from '../storage/actions';
import { useAppState } from '../storage/store';
import { confirmDialog, startRest, summaryStore, toast } from '../storage/ui';

export function WorkoutPage() {
  const active = useAppState((s) => s.active);
  return active ? <ActiveWorkout workout={active} /> : <WorkoutHome />;
}

// =================================================================== Home

function WorkoutHome() {
  const workouts = useAppState((s) => s.workouts);
  const { global } = useRanks();
  const [detail, setDetail] = useState<Workout | null>(null);

  const weekStart = startOfWeek(new Date());
  const week = workoutsBetween(workouts, weekStart, addDays(weekStart, 7));
  const weekStats = week.map((w) => workoutStats(w, EXERCISE_BY_ID));
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const records = useMemo(() => recordCounts(workouts, EXERCISE_BY_ID, sex), [workouts, sex]);

  // Most recent workouts with a distinct exercise list, as one-tap templates.
  const templates = useMemo(() => {
    const seen = new Set<string>();
    const out: Workout[] = [];
    for (let i = workouts.length - 1; i >= 0 && out.length < 4; i--) {
      const key = workouts[i].exercises.map((l) => l.exerciseId).join();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(workouts[i]);
      }
    }
    return out;
  }, [workouts]);

  const recent = [...workouts].reverse().slice(0, 20);

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{formatDay(Date.now())}</span>
        <h1>Entraînement</h1>
      </header>

      <button className="card card-link" onClick={() => navigate('/rangs')}>
        <RankMeter score={global.score} label="Rang global" emblemSize={56} />
        <ChevronRight className="card-link-chevron" size={20} />
      </button>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Cette semaine</h2>
          <button className="link" onClick={() => navigate('/corps')}>
            Voir le corps
          </button>
        </div>
        <WeekStrip weekStart={weekStart} workouts={week} />
        <div className="stats-row">
          <Stat label="Séances" value={week.length} />
          <Stat label="Séries" value={weekStats.reduce((n, s) => n + s.sets, 0)} />
          <Stat label="Volume" value={formatTonnage(weekStats.reduce((n, s) => n + s.tonnage, 0))} />
        </div>
      </section>

      <button className="btn btn-primary btn-xl" onClick={() => A.startWorkout()}>
        <Play size={20} fill="currentColor" />
        Démarrer une séance
      </button>

      {templates.length > 0 && (
        <section>
          <h2 className="section-title">Refaire une séance</h2>
          <div className="template-rail scroll-x">
            {templates.map((w) => (
              <button key={w.id} className="template-card" onClick={() => A.startWorkout(w.id)}>
                <span className="template-title">{workoutTitle(w, EXERCISE_BY_ID)}</span>
                <span className="template-list">
                  {w.exercises.map((l) => EXERCISE_BY_ID[l.exerciseId]?.name).filter(Boolean).join(' · ')}
                </span>
                <span className="template-foot">
                  <span className="text-3 small">{w.exercises.length} exos</span>
                  <span className="template-cta">
                    <Repeat size={14} /> Refaire
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Historique</h2>
        {!recent.length ? (
          <div className="empty-state">
            <Dumbbell size={28} />
            <p>Aucune séance pour l’instant. Lance ta première séance pour obtenir tes rangs.</p>
          </div>
        ) : (
          <div className="list-group">
            {recent.map((w) => (
              <HistoryRow key={w.id} workout={w} records={records.get(w.id) ?? 0} onClick={() => setDetail(w)} />
            ))}
          </div>
        )}
      </section>

      <WorkoutDetailSheet workout={detail} onClose={() => setDetail(null)} />
      <SummarySheet />
    </div>
  );
}

function HistoryRow({ workout: w, records, onClick }: { workout: Workout; records: number; onClick: () => void }) {
  const stats = workoutStats(w, EXERCISE_BY_ID);
  const d = new Date(w.startedAt);
  return (
    <button className="history-row" onClick={onClick}>
      <span className="date-tile">
        <span className="date-tile-day">{d.getDate()}</span>
        <span className="date-tile-month">{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
      </span>
      <span className="history-text">
        <span className="history-title">{workoutTitle(w, EXERCISE_BY_ID)}</span>
        <span className="history-meta">
          {formatDuration(stats.durationMin)} · {stats.sets} séries · {formatTonnage(stats.tonnage)}
        </span>
      </span>
      {records > 0 && (
        <span className="record-badge" aria-label={`${records} record(s)`}>
          <Trophy size={13} />
          {records}
        </span>
      )}
      <ChevronRight size={18} className="text-3" />
    </button>
  );
}

function setLine(ex: Exercise, sets: SetEntry[]) {
  return sets
    .map((s) => (s.warmup ? 'É ' : '') + (ex.scoring.kind === 'reps' ? `${s.reps}` : `${formatNumber(s.weightKg)}×${s.reps}`))
    .join('  ·  ');
}

function WorkoutDetailSheet({ workout: w, onClose }: { workout: Workout | null; onClose: () => void }) {
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  if (!w) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const stats = workoutStats(w, EXERCISE_BY_ID);
  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Supprimer cette séance ?',
      message: 'Les rangs seront recalculés sans elle.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (ok) {
      A.deleteWorkout(w.id);
      onClose();
      toast('Séance supprimée');
    }
  };
  return (
    <Sheet
      open
      onClose={onClose}
      tall
      title={workoutTitle(w, EXERCISE_BY_ID)}
      footer={
        <div className="row gap-sm">
          <button className="btn btn-danger-ghost" onClick={remove} aria-label="Supprimer la séance">
            <Trash2 size={18} />
          </button>
          <button
            className="btn btn-primary btn-lg grow"
            onClick={() => {
              A.startWorkout(w.id);
              onClose();
            }}
          >
            <Repeat size={18} /> Refaire cette séance
          </button>
        </div>
      }
    >
      <p className="text-2 no-margin">{formatDay(w.startedAt)}</p>
      <div className="stats-row">
        <Stat label="Durée" value={formatDuration(stats.durationMin)} />
        <Stat label="Séries" value={stats.sets} />
        <Stat label="Volume" value={formatTonnage(stats.tonnage)} />
      </div>
      <div className="list-group">
        {w.exercises.map((l) => {
          const ex = EXERCISE_BY_ID[l.exerciseId];
          if (!ex) return null;
          const r = scoreSets(ex, l.sets, w.bodyweightKg, sex);
          return (
            <div key={l.uid} className="detail-row">
              <MuscleThumb ex={ex} sex={sex} size={40} />
              <span className="ex-row-text">
                <span className="ex-row-name">{ex.name}</span>
                <span className="ex-row-meta tabular">{setLine(ex, l.sets)}</span>
              </span>
              <RankPill score={r.bestSet ? r.score : null} size="sm" />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Shown right after "Terminer": stats, ranks reached, records. */
function SummarySheet() {
  const id = summaryStore.use((s) => s);
  const workouts = useAppState((s) => s.workouts);
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const w = id ? workouts.find((x) => x.id === id) : undefined;
  const close = () => summaryStore.set(() => null);
  if (!w) return <Sheet open={false} onClose={close}>{null}</Sheet>;

  const stats = workoutStats(w, EXERCISE_BY_ID);
  const outcomes = workoutOutcomes(w, workouts, EXERCISE_BY_ID, sex);
  const records = outcomes.filter((o) => o.status === 'record').length;

  return (
    <Sheet open onClose={close} tall footer={<button className="btn btn-primary btn-lg grow" onClick={close}>Fermer</button>}>
      <div className="summary-hero">
        <span className="summary-icon">
          <Trophy size={28} />
        </span>
        <h2>Séance terminée</h2>
        <p className="text-2 no-margin">
          {records ? `${records} record${records > 1 ? 's' : ''} battu${records > 1 ? 's' : ''}` : 'Bien joué, chaque séance compte.'}
        </p>
      </div>
      <div className="stats-row">
        <Stat label="Durée" value={formatDuration(stats.durationMin)} icon={<Clock size={14} />} />
        <Stat label="Séries" value={stats.sets} icon={<Layers size={14} />} />
        <Stat label="Volume" value={formatTonnage(stats.tonnage)} icon={<Weight size={14} />} />
      </div>
      <h3 className="section-label">Rangs de la séance</h3>
      <div className="list-group">
        {outcomes.map((o) => {
          const ex = EXERCISE_BY_ID[o.exerciseId];
          return (
            <div key={o.exerciseId} className="detail-row">
              <TierEmblem score={o.score} size={36} />
              <span className="ex-row-text">
                <span className="ex-row-name">{ex.name}</span>
                <span className="ex-row-meta">
                  {tierFromScore(o.score).tier.name}
                  {o.tierUp && o.previousScore !== null && ` · depuis ${tierFromScore(o.previousScore).tier.name}`}
                </span>
              </span>
              {o.tierUp ? (
                <span className="tag tag-levelup">
                  <Sparkles size={12} /> Rang +
                </span>
              ) : o.status === 'record' ? (
                <span className="tag tag-record">
                  <Trophy size={12} /> Record
                </span>
              ) : o.status === 'first' ? (
                <span className="tag">Nouveau</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

// ========================================================= Active workout

/** Own component so only the clock re-renders every second, not the whole workout. */
function ElapsedClock({ since }: { since: number }) {
  const now = useNow(1000);
  return <>{formatClock((now - since) / 1000)}</>;
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  // An empty workout almost always starts with picking exercises: save a tap.
  const [picking, setPicking] = useState(workout.exercises.length === 0);
  useWakeLock(true);
  const stats = workoutStats(workout, EXERCISE_BY_ID);

  const finish = async () => {
    const validated = workout.exercises.reduce((n, l) => n + l.sets.filter((s) => s.done).length, 0);
    const pending = workout.exercises.reduce((n, l) => n + l.sets.filter((s) => !s.done).length, 0);
    if (!validated) {
      const ok = await confirmDialog({
        title: 'Aucune série validée',
        message: 'La séance ne sera pas enregistrée. Valide tes séries avec ✓ pour les compter.',
        confirmLabel: 'Quitter sans enregistrer',
        danger: true,
      });
      if (ok) A.cancelWorkout();
      return;
    }
    if (pending) {
      const ok = await confirmDialog({
        title: 'Terminer la séance ?',
        message: `${pending} série${pending > 1 ? 's' : ''} non validée${pending > 1 ? 's' : ''} ser${pending > 1 ? 'ont' : 'a'} ignorée${pending > 1 ? 's' : ''}.`,
        confirmLabel: 'Terminer',
      });
      if (!ok) return;
    }
    A.finishWorkout();
  };

  const abandon = async () => {
    const ok = await confirmDialog({
      title: 'Abandonner la séance ?',
      message: 'Rien ne sera enregistré.',
      confirmLabel: 'Abandonner',
      danger: true,
    });
    if (ok) A.cancelWorkout();
  };

  return (
    <div className="page page-workout">
      <header className="workout-head">
        <div className="workout-head-text">
          <span className="eyebrow live">
            <span className="live-dot" /> Séance en cours
          </span>
          <h1 className="workout-title">
            {workout.exercises.length ? workoutTitle(workout, EXERCISE_BY_ID) : 'Nouvelle séance'}
          </h1>
          <div className="workout-metrics tabular">
            <span>
              <Clock size={14} /> <ElapsedClock since={workout.startedAt} />
            </span>
            <span>
              <Layers size={14} /> {stats.sets} séries
            </span>
            <span>
              <Weight size={14} /> {formatTonnage(stats.tonnage)}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={finish}>
          Terminer
        </button>
      </header>

      {workout.exercises.map((log, i) => (
        <ExerciseCard key={log.uid} log={log} workout={workout} index={i} count={workout.exercises.length} />
      ))}

      {!workout.exercises.length && (
        <div className="empty-state">
          <Dumbbell size={28} />
          <p>Ajoute un ou plusieurs exercices pour commencer.</p>
        </div>
      )}

      <button className="btn btn-dashed btn-xl" onClick={() => setPicking(true)}>
        <Plus size={20} /> Ajouter des exercices
      </button>
      <button className="btn btn-danger-ghost" onClick={abandon}>
        Abandonner la séance
      </button>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onAdd={(ids, n) => {
          A.addExercises(ids, n);
          setPicking(false);
        }}
      />
    </div>
  );
}

function unitLabels(ex: Exercise) {
  const s = ex.scoring;
  return {
    weight: s.kind === 'load' && s.bodyweightFactor ? 'Lest' : ex.perSide ? 'kg/côté' : 'kg',
    reps: s.kind === 'reps' && s.unit === 'sec' ? 'Sec' : 'Reps',
    noWeight: s.kind === 'reps',
  };
}

function ExerciseCard({ log, workout, index, count }: { log: ExerciseLog; workout: Workout; index: number; count: number }) {
  const ex = EXERCISE_BY_ID[log.exerciseId];
  const { best } = useRanks();
  const restSeconds = useAppState((s) => s.profile?.restSeconds ?? A.DEFAULT_REST);
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const previous = useMemo(() => A.previousSetsFor(log.exerciseId), [log.exerciseId]);
  const [menu, setMenu] = useState(false);
  if (!ex) return null;

  const labels = unitLabels(ex);
  const finished = !!log.finishedAt;
  const validated = log.sets.filter((s) => s.done).length;
  let working = 0;

  const remove = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Retirer ${ex.name} ?`, confirmLabel: 'Retirer', danger: true });
    if (ok) A.removeExercise(log.uid);
  };

  return (
    <section className={`card ex-card ${finished ? 'is-finished' : ''}`}>
      <header className="ex-card-head">
        <MuscleThumb ex={ex} sex={sex} size={42} />
        <button className="ex-card-title" onClick={() => navigate(`/exos/${ex.id}`)}>
          <span className="ex-card-name">{ex.name}</span>
          <span className="ex-card-meta">{muscleList(ex)}</span>
        </button>
        <RankPill score={best.get(ex.id)?.score ?? null} size="sm" />
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Options de l’exercice">
          <Ellipsis size={20} />
        </button>
      </header>

      {finished ? (
        <ExerciseResult ex={ex} log={log} workout={workout} />
      ) : (
        <>
          <div className={`set-table ${labels.noWeight ? 'no-weight' : ''}`} role="table">
            <div className="set-head" role="row">
              <span>Série</span>
              <span>Précédent</span>
              {!labels.noWeight && <span>{labels.weight}</span>}
              <span>{labels.reps}</span>
              <span aria-label="Validée">
                <Check size={14} />
              </span>
            </div>
            {log.sets.map((set, i) => {
              if (!set.warmup) working++;
              return (
                <SetRow
                  key={i}
                  logUid={log.uid}
                  index={i}
                  number={set.warmup ? null : working}
                  set={set}
                  prev={previous[i]}
                  ex={ex}
                  noWeight={labels.noWeight}
                  restSeconds={restSeconds}
                />
              );
            })}
          </div>
          {index === 0 && <p className="set-hint">Touche le numéro d’une série pour la marquer en échauffement.</p>}
          <div className="ex-card-actions">
            <button className="btn btn-soft" onClick={() => A.addSet(log.uid)}>
              <Plus size={18} /> Série
            </button>
            <button className="btn btn-primary grow" disabled={!validated} onClick={() => A.finishExercise(log.uid)}>
              Terminer l’exo
            </button>
          </div>
        </>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={ex.name}>
        <div className="menu-list">
          <button onClick={() => navigate(`/exos/${ex.id}`)}>
            <BookOpen size={20} /> Voir la fiche
          </button>
          {index > 0 && (
            <button onClick={() => (A.moveExercise(log.uid, -1), setMenu(false))}>
              <ArrowUp size={20} /> Monter
            </button>
          )}
          {index < count - 1 && (
            <button onClick={() => (A.moveExercise(log.uid, 1), setMenu(false))}>
              <ArrowDown size={20} /> Descendre
            </button>
          )}
          {log.sets.length > 0 && !finished && (
            <button onClick={() => (A.removeSet(log.uid, log.sets.length - 1), setMenu(false))}>
              <Minus size={20} /> Supprimer la dernière série
            </button>
          )}
          <button className="is-danger" onClick={remove}>
            <Trash2 size={20} /> Retirer l’exercice
          </button>
        </div>
      </Sheet>
    </section>
  );
}

function inputValue(n: number) {
  return n ? String(n).replace('.', ',') : '';
}

function SetRow({
  logUid,
  index,
  number,
  set,
  prev,
  ex,
  noWeight,
  restSeconds,
}: {
  logUid: string;
  index: number;
  number: number | null;
  set: SetEntry;
  prev?: SetEntry;
  ex: Exercise;
  noWeight: boolean;
  restSeconds: number;
}) {
  // Local text so typing "62," or clearing the field doesn't fight the parser.
  const [w, setW] = useState(inputValue(set.weightKg));
  const [r, setR] = useState(inputValue(set.reps));
  useEffect(() => setW(inputValue(set.weightKg)), [set.weightKg]);
  useEffect(() => setR(inputValue(set.reps)), [set.reps]);

  const prevText = prev
    ? ex.scoring.kind === 'reps'
      ? `${prev.reps}${ex.scoring.unit === 'sec' ? ' s' : ''}`
      : `${formatNumber(prev.weightKg)} × ${prev.reps}`
    : '—';

  const toggle = () => {
    const done = !set.done;
    A.updateSet(logUid, index, { done, weightKg: parseNumber(w), reps: Math.round(parseNumber(r)) });
    if (done) {
      primeAudio();
      haptic();
      startRest(set.warmup ? Math.min(restSeconds, 60) : restSeconds);
    }
  };

  return (
    <div className={`set-row ${set.done ? 'is-done' : ''} ${set.warmup ? 'is-warmup' : ''}`} role="row">
      <button
        className="set-num"
        onClick={() => A.updateSet(logUid, index, { warmup: !set.warmup })}
        aria-label={set.warmup ? 'Échauffement — toucher pour en faire une série de travail' : `Série ${number} — toucher pour la marquer en échauffement`}
      >
        {set.warmup ? 'É' : number}
      </button>
      <button
        className="set-prev tabular"
        disabled={!prev}
        onClick={() => prev && A.updateSet(logUid, index, { weightKg: prev.weightKg, reps: prev.reps })}
        aria-label={prev ? `Reprendre la valeur précédente ${prevText}` : 'Pas de valeur précédente'}
      >
        {prevText}
      </button>
      {!noWeight && (
        <input
          className="set-input tabular"
          inputMode="decimal"
          enterKeyHint="next"
          placeholder="0"
          value={w}
          aria-label="Charge"
          onChange={(e) => setW(e.target.value)}
          onBlur={() => A.updateSet(logUid, index, { weightKg: parseNumber(w) })}
          onFocus={(e) => e.target.select()}
        />
      )}
      <input
        className="set-input tabular"
        inputMode="numeric"
        enterKeyHint="done"
        placeholder="0"
        value={r}
        aria-label={ex.scoring.kind === 'reps' && ex.scoring.unit === 'sec' ? 'Secondes' : 'Répétitions'}
        onChange={(e) => setR(e.target.value)}
        onBlur={() => A.updateSet(logUid, index, { reps: Math.round(parseNumber(r)) })}
        onFocus={(e) => e.target.select()}
      />
      <button className={`set-check ${set.done ? 'is-on' : ''}`} onClick={toggle} aria-pressed={set.done} aria-label="Valider la série">
        <Check size={20} strokeWidth={3} />
      </button>
    </div>
  );
}

/** Shown on "Terminer l'exo": the rank earned by this block. */
function ExerciseResult({ ex, log, workout }: { ex: Exercise; log: ExerciseLog; workout: Workout }) {
  const { best } = useRanks();
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const result = scoreSets(ex, log.sets, workout.bodyweightKg, sex);
  const previous = best.get(ex.id);
  const isPR = !!result.bestSet && (!previous || result.score > previous.score + 1e-9);
  const tierUp = !!previous && tierFromScore(result.score).index > tierFromScore(previous.score).index;
  const b = result.bestSet;
  const isReps = ex.scoring.kind === 'reps';
  const unit = isReps ? (ex.scoring.kind === 'reps' && ex.scoring.unit === 'sec' ? 's' : 'reps') : 'kg';

  return (
    <div className="ex-result">
      {tierUp ? (
        <div className="banner banner-levelup">
          <Sparkles size={16} /> Nouveau rang débloqué : {tierFromScore(result.score).tier.name}
        </div>
      ) : isPR ? (
        <div className="banner banner-record">
          <Trophy size={16} /> {previous ? 'Nouveau record personnel' : 'Premier classement sur cet exo'}
        </div>
      ) : null}
      <div className={tierUp ? 'pop' : undefined}>
        <RankMeter
          score={b ? result.score : null}
          emblemSize={52}
          hint={b ? nextTierHint(ex, result.value, workout.bodyweightKg, sex) : null}
        />
      </div>
      {b && (
        <dl className="facts">
          <div>
            <dt>Meilleure série</dt>
            <dd className="tabular">{isReps ? `${b.reps} ${unit}` : `${formatNumber(b.weightKg)} × ${b.reps}`}</dd>
          </div>
          <div>
            <dt>{isReps ? 'Record' : '1RM estimé'}</dt>
            <dd className="tabular">
              {formatNumber(Math.round(displayValue(ex, result.value, workout.bodyweightKg) * 10) / 10)} {unit}
            </dd>
          </div>
          <div>
            <dt>Séries</dt>
            <dd className="tabular">{log.sets.filter((s) => s.done && !s.warmup).length}</dd>
          </div>
        </dl>
      )}
      <button className="btn btn-soft btn-sm" onClick={() => A.reopenExercise(log.uid)}>
        <Pencil size={16} /> Modifier
      </button>
    </div>
  );
}
