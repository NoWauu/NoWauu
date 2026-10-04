import { useRef, useState } from 'react';
import type { Profile, Sex } from '../domain/types';
import { saveProfile } from '../storage/actions';
import { exportJson, importJson, setState, useAppState } from '../storage/store';

export function ProfileForm({ initial, onSaved }: { initial: Profile | null; onSaved?: () => void }) {
  const [bw, setBw] = useState(String(initial?.bodyweightKg ?? 75));
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'M');
  const value = parseFloat(bw.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 30 && value <= 300;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        saveProfile({ bodyweightKg: Math.round(value * 10) / 10, sex });
        onSaved?.();
      }}
    >
      <label className="field-label" htmlFor="bw">
        Poids de corps (kg)
      </label>
      <input id="bw" className="field" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} />
      <span className="field-label">Barèmes</span>
      <div className="segmented">
        <button type="button" className={sex === 'M' ? 'on' : ''} onClick={() => setSex('M')}>
          Homme
        </button>
        <button type="button" className={sex === 'F' ? 'on' : ''} onClick={() => setSex('F')}>
          Femme
        </button>
      </div>
      <p className="muted small no-margin">
        Les rangs sont relatifs à ton poids de corps. Chaque séance garde le poids du moment : mets-le à jour quand il
        change, ton historique reste juste.
      </p>
      <button className="btn primary" disabled={!valid}>
        Enregistrer
      </button>
    </form>
  );
}

export function ProfilePage() {
  const profile = useAppState((s) => s.profile);
  const workouts = useAppState((s) => s.workouts);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    try {
      importJson(await file.text());
      alert('Sauvegarde importée.');
    } catch {
      alert('Fichier invalide.');
    }
  };

  return (
    <div className="page">
      <h1>Profil</h1>
      <section className="card">
        <ProfileForm initial={profile} onSaved={() => setSaved(true)} />
        {saved && <p className="small ok">Profil enregistré.</p>}
      </section>

      <section className="card stack">
        <h2>Données</h2>
        <p className="muted small no-margin">
          Tout est stocké sur cet appareil ({workouts.length} séances). Exporte régulièrement une sauvegarde.
        </p>
        <button className="btn outline" onClick={download}>
          Exporter (JSON)
        </button>
        <button className="btn outline" onClick={() => fileRef.current?.click()}>
          Importer une sauvegarde
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button
          className="btn danger ghost"
          onClick={() =>
            confirm('Effacer toutes les séances ? Cette action est définitive.') &&
            setState((s) => ({ ...s, workouts: [], active: null }))
          }
        >
          Effacer l’historique
        </button>
      </section>
    </div>
  );
}
