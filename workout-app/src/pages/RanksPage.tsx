import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BodyMap } from '../components/body/BodyMap';
import { MuscleThumb } from '../components/body/MuscleThumb';
import { RankMeter, RankPill, TierEmblem } from '../components/Rank';
import { Sheet } from '../components/ui/Sheet';
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_BY_ID, MUSCLE_GROUPS } from '../domain/muscles';
import { TIERS, tierFromScore, type GroupRank } from '../domain/ranking';
import type { MuscleGroupId } from '../domain/types';
import { useRanks } from '../hooks/useRanks';
import { navigate } from '../hooks/useRoute';
import { useAppState } from '../storage/store';

export function RanksPage() {
  const { groups, global } = useRanks();
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  const [open, setOpen] = useState<MuscleGroupId | null>(null);
  const rated = groups.filter((g) => g.score !== null).length;
  const scoreOf = (g: MuscleGroupId) => groups.find((x) => x.group === g)?.score ?? null;
  const g = global.score;
  const info = g === null ? null : tierFromScore(g);
  const next = info ? TIERS[info.index + 1] : undefined;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Classement</span>
        <h1>Rangs</h1>
      </header>

      <section className="card rank-hero">
        <div className={`rank-hero-emblem ${info ? `tier-${info.index}` : ''}`}>
          <TierEmblem score={g} size={112} />
        </div>
        <span className="eyebrow">Rang global</span>
        <strong className="rank-hero-name">{info ? info.tier.name : 'Non classé'}</strong>
        {info && (
          <>
            <div className="meter meter-lg">
              <div className="meter-fill" style={{ width: `${info.progress * 100}%`, background: info.tier.color }} />
            </div>
            <span className="text-2 small">
              {next ? `${Math.round(info.progress * 100)} % vers ${next.name}` : 'Sommet atteint'}
            </span>
          </>
        )}
        <span className="text-3 small">
          {rated}/{MUSCLE_GROUPS.length} muscles classés
          {rated < MUSCLE_GROUPS.length && ' · entraîne les autres pour un rang complet'}
        </span>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Carte des rangs</h2>
        </div>
        <BodyMap
          sex={sex}
          captions
          fill={(m) => {
            const s = scoreOf(m);
            return s === null ? null : tierFromScore(s).tier.color;
          }}
          selected={open}
          onSelect={setOpen}
        />
        <div className="tier-legend">
          {TIERS.map((t, i) => (
            <span key={t.id}>
              <TierEmblem score={i + 0.5} size={18} />
              {t.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Par muscle</h2>
        <div className="list-group">
          {groups.map((gr) => (
            <GroupRow key={gr.group} rank={gr} onClick={() => setOpen(gr.group)} />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Comment ça marche</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <span>
              <strong>Exercice</strong> — ta meilleure série : 1RM estimé rapporté à ton poids de corps, ou nombre de reps
              pour le poids du corps.
            </span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>
              <strong>Muscle</strong> — moyenne des exercices réalisés qui le ciblent en principal.
            </span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span>
              <strong>Global</strong> — moyenne des muscles classés ; chaque muscle pèse pareil.
            </span>
          </li>
        </ol>
        <p className="footnote">
          Les moyennes portent sur un score continu (la progression dans le palier compte), jamais sur les noms de rangs.
        </p>
      </section>

      <GroupSheet group={open} rank={groups.find((x) => x.group === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}

function GroupRow({ rank, onClick }: { rank: GroupRank; onClick: () => void }) {
  const info = rank.score === null ? null : tierFromScore(rank.score);
  return (
    <button className="group-row" onClick={onClick}>
      <TierEmblem score={rank.score} size={36} />
      <span className="group-row-body">
        <span className="row between baseline">
          <span className="group-row-name">{MUSCLE_BY_ID[rank.group].name}</span>
          <span className="text-2 small">{info ? info.tier.name : 'Non classé'}</span>
        </span>
        <span className="meter meter-sm">
          {info && <span className="meter-fill" style={{ width: `${info.progress * 100}%`, background: info.tier.color }} />}
        </span>
      </span>
      <ChevronRight size={18} className="text-3" />
    </button>
  );
}

function GroupSheet({ group, rank, onClose }: { group: MuscleGroupId | null; rank: GroupRank | null; onClose: () => void }) {
  const sex = useAppState((s) => s.profile?.sex ?? 'M');
  return (
    <Sheet open={!!group && !!rank} onClose={onClose} title={group ? MUSCLE_BY_ID[group].name : ''}>
      {rank && (
        <>
          <RankMeter score={rank.score} emblemSize={56} />
          <h3 className="section-label">
            {rank.contributors.length ? 'Exercices pris en compte' : 'Aucun exercice réalisé pour ce muscle'}
          </h3>
          <div className="list-group">
            {rank.contributors.map((c) => {
              const ex = EXERCISE_BY_ID[c.exerciseId];
              return (
                <button key={c.exerciseId} className="ex-row" onClick={() => navigate(`/exos/${c.exerciseId}`)}>
                  <MuscleThumb ex={ex} sex={sex} size={40} />
                  <span className="ex-row-text">
                    <span className="ex-row-name">{ex.name}</span>
                  </span>
                  <RankPill score={c.score} size="sm" />
                </button>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}
