import { Check, Minus, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import type { Exercise, MuscleGroupId, Sex } from '../domain/types';
import { useAppState } from '../storage/store';
import { MuscleThumb } from './body/MuscleThumb';
import { Sheet } from './ui/Sheet';

export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function muscleList(ex: Exercise) {
  return ex.primary.map((g) => MUSCLE_BY_ID[g].name).join(', ');
}

export interface Section {
  key: string;
  title: string;
  items: Exercise[];
}

/** Search + muscle chips, returning exercises grouped into titled sections. */
export function useExerciseFilter({ withRecent = false } = {}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroupId | null>(null);
  const workouts = useAppState((s) => s.workouts);

  const sections = useMemo<Section[]>(() => {
    const q = normalize(query.trim());
    const match = (e: Exercise) =>
      (!group || e.primary.includes(group)) &&
      (!q || normalize(`${e.name} ${e.equipment} ${muscleList(e)}`).includes(q));
    const out: Section[] = [];
    if (withRecent && !q && !group) {
      const seen = new Set<string>();
      for (let i = workouts.length - 1; i >= 0 && seen.size < 6; i--) {
        for (const l of workouts[i].exercises) if (EXERCISE_BY_ID[l.exerciseId]) seen.add(l.exerciseId);
      }
      const recent = [...seen].slice(0, 6).map((id) => EXERCISE_BY_ID[id]);
      if (recent.length) out.push({ key: 'recent', title: 'Récents', items: recent });
    }
    for (const m of MUSCLE_GROUPS) {
      if (group && m.id !== group) continue;
      // An exercise is listed under its first primary muscle only.
      const items = EXERCISES.filter((e) => e.primary[0] === m.id && match(e));
      if (group) items.push(...EXERCISES.filter((e) => e.primary[0] !== m.id && match(e)));
      if (items.length) out.push({ key: m.id, title: m.name, items });
    }
    return out;
  }, [query, group, workouts, withRecent]);

  const count = sections.reduce((n, s) => n + (s.key === 'recent' ? 0 : s.items.length), 0);

  const controls = (
    <div className="filters">
      <label className="search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Rechercher un exercice, un muscle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="chips scroll-x" role="tablist">
        <button className={`chip ${group === null ? 'is-on' : ''}`} onClick={() => setGroup(null)}>
          Tous
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m.id}
            className={`chip ${group === m.id ? 'is-on' : ''}`}
            onClick={() => setGroup(group === m.id ? null : m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
  return { sections, count, controls };
}

export function ExerciseRow({
  ex,
  sex,
  right,
  onClick,
  selected,
}: {
  ex: Exercise;
  sex: Sex;
  right?: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button className={`ex-row ${selected ? 'is-selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <MuscleThumb ex={ex} sex={sex} />
      <span className="ex-row-text">
        <span className="ex-row-name">{ex.name}</span>
        <span className="ex-row-meta">
          {ex.equipment} · {muscleList(ex)}
        </span>
      </span>
      {right}
    </button>
  );
}

interface PickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (ids: string[], sets: number) => void;
}

export function ExercisePicker({ open, onClose, onAdd }: PickerProps) {
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const { sections, controls } = useExerciseFilter({ withRecent: true });
  const [picked, setPicked] = useState<string[]>([]);
  const [sets, setSets] = useState(3);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const close = () => {
    setPicked([]);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      tall
      title="Ajouter des exercices"
      footer={
        <div className="picker-foot">
          <div className="stepper" aria-label="Séries par exercice">
            <button onClick={() => setSets((n) => Math.max(1, n - 1))} aria-label="Moins de séries">
              <Minus size={18} />
            </button>
            <span>
              <strong className="tabular">{sets}</strong> séries
            </span>
            <button onClick={() => setSets((n) => Math.min(12, n + 1))} aria-label="Plus de séries">
              <Plus size={18} />
            </button>
          </div>
          <button
            className="btn btn-primary btn-lg grow"
            disabled={!picked.length}
            onClick={() => {
              onAdd(picked, sets);
              setPicked([]);
            }}
          >
            Ajouter{picked.length ? ` (${picked.length})` : ''}
          </button>
        </div>
      }
    >
      <div className="picker-controls">{controls}</div>
      {sections.map((s) => (
        <section key={s.key} className="list-section">
          <h3 className="section-label">{s.title}</h3>
          <div className="list-group">
            {s.items.map((e) => {
              const on = picked.includes(e.id);
              return (
                <ExerciseRow
                  key={`${s.key}-${e.id}`}
                  ex={e}
                  sex={sex}
                  selected={on}
                  onClick={() => toggle(e.id)}
                  right={
                    <span className={`check-circle ${on ? 'is-on' : ''}`}>
                      {on && <Check size={16} strokeWidth={3} />}
                    </span>
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
      {!sections.length && <p className="empty">Aucun exercice ne correspond.</p>}
    </Sheet>
  );
}
