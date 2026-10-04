import { useState } from 'react';
import { RankBadge, RankMeter } from '../components/Rank';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import { TIERS } from '../domain/ranking';
import type { MuscleGroupId } from '../domain/types';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';

export function RanksPage() {
  const { groups, global } = useRanks();
  const [open, setOpen] = useState<MuscleGroupId | null>(null);

  return (
    <div className="page">
      <h1>Rangs</h1>

      <section className="card global-rank">
        <span className="muted small">Rang global</span>
        <RankMeter score={global.score} />
        <p className="muted small no-margin">
          Moyenne de {Math.round(global.coverage * MUSCLE_GROUPS.length)} groupe(s) classé(s) sur {MUSCLE_GROUPS.length}.
          {global.coverage < 1 && ' Entraîne les groupes non classés pour compléter ton rang.'}
        </p>
      </section>

      <h2>Par groupe musculaire</h2>
      <ul className="list">
        {groups.map((g) => (
          <li key={g.group} className="card">
            <button className="list-item flat" onClick={() => setOpen(open === g.group ? null : g.group)}>
              <span className="grow">
                <strong>{MUSCLE_BY_ID[g.group].name}</strong>
                <span className="muted small block">
                  {g.contributors.length ? `${g.contributors.length} exo(s) pris en compte` : 'Aucun exo réalisé'}
                </span>
              </span>
              <RankBadge score={g.score} size="sm" />
            </button>
            {open === g.group && (
              <div className="stack small-gap">
                {g.score !== null && <RankMeter score={g.score} />}
                {g.contributors.map((c) => (
                  <button key={c.exerciseId} className="row between plain" onClick={() => navigate(`/exos/${c.exerciseId}`)}>
                    <span>{EXERCISE_BY_ID[c.exerciseId]?.name}</span>
                    <RankBadge score={c.score} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="card">
        <h2>Comment ça marche</h2>
        <div className="tier-ladder">
          {TIERS.map((t) => (
            <span key={t.id} className="rank-badge sm" style={{ '--tier': t.color } as React.CSSProperties}>
              {t.name}
            </span>
          ))}
        </div>
        <ul className="tips">
          <li>
            Chaque exo est classé sur ta meilleure série : 1RM estimé rapporté à ton poids de corps, ou nombre de reps
            pour les exos au poids du corps.
          </li>
          <li>Le rang d’un groupe est la moyenne des exos que tu as faits pour ce groupe.</li>
          <li>Le rang global est la moyenne des groupes classés (chaque groupe pèse pareil).</li>
          <li>Les moyennes se font sur un score continu, pas sur les noms de rangs : la progression compte.</li>
        </ul>
      </section>
    </div>
  );
}
