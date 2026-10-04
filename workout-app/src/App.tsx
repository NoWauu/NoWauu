import { ExerciseDetailPage, ExercisesPage } from './pages/ExercisesPage';
import { ProfileForm, ProfilePage } from './pages/ProfilePage';
import { RanksPage } from './pages/RanksPage';
import { WeekPage } from './pages/WeekPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { useRoute } from './hooks/useRoute';
import { useAppState } from './storage/store';

const TABS = [
  { path: '', label: 'Séance', icon: '🏋️' },
  { path: 'exos', label: 'Exos', icon: '📖' },
  { path: 'semaine', label: 'Semaine', icon: '🧍' },
  { path: 'rangs', label: 'Rangs', icon: '🏆' },
  { path: 'profil', label: 'Profil', icon: '⚙️' },
];

export function App() {
  const profile = useAppState((s) => s.profile);
  const hasActive = useAppState((s) => s.active !== null);
  const [section = '', param] = useRoute();

  if (!profile) {
    return (
      <main className="page onboarding">
        <h1>Bienvenue 💪</h1>
        <p className="muted">
          Ton carnet d’entraînement avec rangs par exercice, par muscle et global. Pour calibrer les rangs, on a besoin
          de deux infos.
        </p>
        <section className="card">
          <ProfileForm initial={null} />
        </section>
      </main>
    );
  }

  let page;
  switch (section) {
    case 'exos':
      page = param ? <ExerciseDetailPage id={param} /> : <ExercisesPage />;
      break;
    case 'semaine':
      page = <WeekPage />;
      break;
    case 'rangs':
      page = <RanksPage />;
      break;
    case 'profil':
      page = <ProfilePage />;
      break;
    default:
      page = <WorkoutPage />;
  }

  return (
    <>
      <main key={`${section}/${param ?? ''}`}>{page}</main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <a key={t.path} href={`#/${t.path}`} className={section === t.path ? 'on' : ''}>
            <span className="tab-icon">
              {t.icon}
              {t.path === '' && hasActive && <span className="live-dot" />}
            </span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
