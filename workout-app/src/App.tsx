import { BookOpen, ChevronRight, Dumbbell, PersonStanding, Trophy, UserRound } from 'lucide-react';
import { RestTimer } from './components/RestTimer';
import { ConfirmHost, ToastHost } from './components/ui/Hosts';
import { useRoute } from './hooks/useRoute';
import { formatClock } from './lib/format';
import { useNow } from './lib/hooks';
import { BodyPage } from './pages/BodyPage';
import { ExerciseDetailPage, ExercisesPage } from './pages/ExercisesPage';
import { Onboarding, ProfilePage } from './pages/ProfilePage';
import { RanksPage } from './pages/RanksPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { useAppState } from './storage/store';

const TABS = [
  { path: '', label: 'Séance', Icon: Dumbbell },
  { path: 'exos', label: 'Exercices', Icon: BookOpen },
  { path: 'corps', label: 'Corps', Icon: PersonStanding },
  { path: 'rangs', label: 'Rangs', Icon: Trophy },
  { path: 'profil', label: 'Profil', Icon: UserRound },
];

/** Floating shortcut back to the running workout from any other tab. */
function ActiveWorkoutPill() {
  const startedAt = useAppState((s) => s.active?.startedAt ?? null);
  const now = useNow(1000, startedAt !== null);
  if (startedAt === null) return null;
  return (
    <a className="active-pill" href="#/">
      <span className="live-dot" />
      Séance en cours
      <span className="tabular text-2">{formatClock((now - startedAt) / 1000)}</span>
      <ChevronRight size={16} />
    </a>
  );
}

export function App() {
  const hasProfile = useAppState((s) => s.profile !== null);
  const hasActive = useAppState((s) => s.active !== null);
  const [section = '', param] = useRoute();

  if (!hasProfile) return <Onboarding />;

  let page;
  switch (section) {
    case 'exos':
      page = param ? <ExerciseDetailPage id={param} /> : <ExercisesPage />;
      break;
    case 'corps':
      page = <BodyPage />;
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
      <main key={`${section}/${param ?? ''}`} className="view">
        {page}
      </main>
      <div className="dock">
        {section !== '' && <ActiveWorkoutPill />}
        <RestTimer />
      </div>
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(({ path, label, Icon }) => (
          <a key={path} href={`#/${path}`} className={section === path ? 'is-active' : ''} aria-current={section === path ? 'page' : undefined}>
            <span className="tab-icon">
              <Icon size={22} strokeWidth={section === path ? 2.4 : 1.9} />
              {path === '' && hasActive && <span className="tab-badge" />}
            </span>
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <ConfirmHost />
      <ToastHost />
    </>
  );
}
