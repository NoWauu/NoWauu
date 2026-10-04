import { Download, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Profile, Sex } from '../domain/types';
import { parseNumber } from '../lib/format';
import { DEFAULT_REST, clearHistory, saveProfile } from '../storage/actions';
import { exportJson, importJson, useAppState } from '../storage/store';
import { confirmDialog, toast } from '../storage/ui';

const REST_OPTIONS = [60, 90, 120, 180];

function validWeight(v: number) {
  return v >= 30 && v <= 300;
}

/** First-launch form: the two numbers the ranks are calibrated on. */
export function Onboarding() {
  const [bw, setBw] = useState('75');
  const [sex, setSex] = useState<Sex>('M');
  const value = parseNumber(bw);
  return (
    <main className="page onboarding">
      <div className="onboarding-hero">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 64 64" width="56" height="56">
            <path d="M32 2.5 L58 17.5 V46.5 L32 61.5 L6 46.5 V17.5 Z" fill="var(--accent)" />
            <path d="M21.5 36 L32 28 L42.5 36 M21.5 44 L32 36 L42.5 44" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1>Workout Ranks</h1>
        <p className="text-2">
          Note tes séances, découvre ton rang sur chaque exercice, chaque muscle et au global — de Novice à Legend.
        </p>
      </div>
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (validWeight(value)) saveProfile({ bodyweightKg: Math.round(value * 10) / 10, sex, restSeconds: DEFAULT_REST, restSound: true });
        }}
      >
        <label className="field">
          <span className="field-label">Poids de corps</span>
          <span className="input-affix">
            <input inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} onFocus={(e) => e.target.select()} />
            <span>kg</span>
          </span>
        </label>
        <div className="field">
          <span className="field-label">Barèmes et silhouette</span>
          <SexToggle value={sex} onChange={setSex} />
        </div>
        <p className="text-3 small no-margin">Les rangs sont relatifs à ton poids de corps. Tu pourras le modifier à tout moment.</p>
        <button className="btn btn-primary btn-lg" disabled={!validWeight(value)}>
          Commencer
        </button>
      </form>
    </main>
  );
}

function SexToggle({ value, onChange }: { value: Sex; onChange: (s: Sex) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {(['M', 'F'] as const).map((s) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} className={value === s ? 'is-on' : ''} onClick={() => onChange(s)}>
          {s === 'M' ? 'Homme' : 'Femme'}
        </button>
      ))}
    </div>
  );
}

export function ProfilePage() {
  const profile = useAppState((s) => s.profile) as Profile;
  const workouts = useAppState((s) => s.workouts);
  const [bw, setBw] = useState(String(profile.bodyweightKg).replace('.', ','));
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<Profile>, message = 'Profil mis à jour') => {
    saveProfile({ ...profile, ...patch });
    toast(message);
  };

  const commitWeight = () => {
    const v = Math.round(parseNumber(bw) * 10) / 10;
    if (!validWeight(v)) return setBw(String(profile.bodyweightKg).replace('.', ','));
    if (v !== profile.bodyweightKg) update({ bodyweightKg: v }, `Poids enregistré : ${String(v).replace('.', ',')} kg`);
  };

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workout-ranks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    const ok = await confirmDialog({
      title: 'Importer cette sauvegarde ?',
      message: 'Elle remplace toutes les données actuelles de cet appareil.',
      confirmLabel: 'Importer',
    });
    if (!ok) return;
    try {
      importJson(await file.text());
      toast('Sauvegarde importée');
    } catch {
      toast('Fichier invalide');
    }
  };

  const wipe = async () => {
    const ok = await confirmDialog({
      title: 'Effacer tout l’historique ?',
      message: `${workouts.length} séance(s) seront supprimées définitivement. Exporte une sauvegarde avant si besoin.`,
      confirmLabel: 'Tout effacer',
      danger: true,
    });
    if (ok) {
      clearHistory();
      toast('Historique effacé');
    }
  };

  const rest = profile.restSeconds ?? DEFAULT_REST;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Réglages</span>
        <h1>Profil</h1>
      </header>

      <section>
        <h2 className="section-title">Corps</h2>
        <div className="card settings">
          <label className="setting">
            <span className="setting-text">
              <span>Poids de corps</span>
              <span className="text-3 small">Base de calcul des rangs</span>
            </span>
            <span className="input-affix input-affix-sm">
              <input
                inputMode="decimal"
                value={bw}
                onChange={(e) => setBw(e.target.value)}
                onBlur={commitWeight}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                onFocus={(e) => e.target.select()}
              />
              <span>kg</span>
            </span>
          </label>
          <div className="setting setting-col">
            <span className="setting-text">
              <span>Barèmes et silhouette</span>
              <span className="text-3 small">Change les seuils de rang et le schéma du corps</span>
            </span>
            <SexToggle value={profile.sex} onChange={(sex) => update({ sex })} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Séance</h2>
        <div className="card settings">
          <div className="setting setting-col">
            <span className="setting-text">
              <span>Repos entre les séries</span>
              <span className="text-3 small">Lancé automatiquement à chaque série validée</span>
            </span>
            <div className="segmented">
              {REST_OPTIONS.map((s) => (
                <button key={s} className={rest === s ? 'is-on' : ''} onClick={() => update({ restSeconds: s }, `Repos : ${s} s`)}>
                  {s < 120 ? `${s} s` : `${s / 60} min`}
                </button>
              ))}
            </div>
          </div>
          <label className="setting">
            <span className="setting-text">
              <span>Son en fin de repos</span>
              <span className="text-3 small">La vibration est toujours active (Android)</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={profile.restSound ?? true}
              onChange={(e) => update({ restSound: e.target.checked })}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-title">Données</h2>
        <div className="card settings">
          <p className="text-2 small no-margin">
            Tout est stocké sur cet appareil ({workouts.length} séance{workouts.length > 1 ? 's' : ''}). Exporte une
            sauvegarde de temps en temps.
          </p>
          <div className="row gap-sm wrap">
            <button className="btn btn-soft grow" onClick={download}>
              <Download size={18} /> Exporter
            </button>
            <button className="btn btn-soft grow" onClick={() => fileRef.current?.click()}>
              <Upload size={18} /> Importer
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void upload(f);
            }}
          />
          <button className="btn btn-danger-ghost" onClick={wipe}>
            <Trash2 size={18} /> Effacer l’historique
          </button>
        </div>
      </section>

      <p className="footnote center">
        Illustration anatomique : react-native-body-highlighter (licence MIT).
        <br />
        Aucune donnée ne quitte ton téléphone.
      </p>
    </div>
  );
}
