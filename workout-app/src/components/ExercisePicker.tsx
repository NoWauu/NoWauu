import { useMemo, useState } from 'react';
import { EXERCISES } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import type { Exercise, MuscleGroupId } from '../domain/types';

export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Search box + muscle filter chips; shared by the library and the picker. */
export function useExerciseFilter() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroupId | null>(null);
  const list = useMemo(() => {
    const q = normalize(query.trim());
    return EXERCISES.filter(
      (e) => (!group || e.primary.includes(group)) && (!q || normalize(e.name).includes(q)),
    );
  }, [query, group]);

  const controls = (
    <div className="filters">
      <input
        className="search"
        type="search"
        placeholder="Rechercher un exercice…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips scroll-x">
        <button className={`chip ${group === null ? 'on' : ''}`} onClick={() => setGroup(null)}>
          Tous
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button key={m.id} className={`chip ${group === m.id ? 'on' : ''}`} onClick={() => setGroup(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
  return { list, controls };
}

export function muscleList(ex: Exercise) {
  return ex.primary.map((g) => MUSCLE_BY_ID[g].name).join(' · ');
}

interface Props {
  onPick: (exerciseId: string, sets: number) => void;
  onClose: () => void;
}

export function ExercisePicker({ onPick, onClose }: Props) {
  const { list, controls } = useExerciseFilter();
  const [chosen, setChosen] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{chosen ? chosen.name : 'Ajouter un exercice'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {chosen ? (
          <div className="stack">
            <p className="muted">{muscleList(chosen)}</p>
            <label className="field-label">Nombre de séries</label>
            <div className="stepper">
              <button onClick={() => setSets((n) => Math.max(1, n - 1))}>−</button>
              <span>{sets}</span>
              <button onClick={() => setSets((n) => Math.min(12, n + 1))}>+</button>
            </div>
            <p className="muted small">Les séries sont pré-remplies avec ta dernière séance sur cet exo.</p>
            <div className="row">
              <button className="btn ghost" onClick={() => setChosen(null)}>
                Retour
              </button>
              <button className="btn primary grow" onClick={() => onPick(chosen.id, sets)}>
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <>
            {controls}
            <ul className="list modal-list">
              {list.map((e) => (
                <li key={e.id}>
                  <button className="list-item" onClick={() => setChosen(e)}>
                    <span className="grow">
                      <strong>{e.name}</strong>
                      <span className="muted small block">
                        {e.equipment} · {muscleList(e)}
                      </span>
                    </span>
                    <span className="chev">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
