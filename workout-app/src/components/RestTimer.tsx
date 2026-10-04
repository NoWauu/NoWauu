import { Minus, Plus, SkipForward, Timer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { beep, haptic } from '../lib/feedback';
import { formatClock } from '../lib/format';
import { useNow } from '../lib/hooks';
import { adjustRest, restStore, stopRest } from '../storage/ui';
import { useAppState } from '../storage/store';

/** Floating countdown shown above the tab bar after each validated set. */
export function RestTimer() {
  const { endsAt, total } = restStore.use((s) => s);
  const sound = useAppState((s) => s.profile?.restSound ?? true);
  const now = useNow(250, endsAt !== null);
  const firedFor = useRef<number | null>(null);

  const remaining = endsAt ? Math.max(0, (endsAt - now) / 1000) : 0;
  const done = endsAt !== null && remaining <= 0;

  useEffect(() => {
    if (!done || firedFor.current === endsAt) return;
    firedFor.current = endsAt;
    // Reopening the app long after the rest ended: just clear it, no alarm.
    if (Date.now() - endsAt > 5000) {
      stopRest();
      return;
    }
    haptic([180, 90, 180]);
    if (sound) beep();
    const t = setTimeout(stopRest, 2500);
    return () => clearTimeout(t);
  }, [done, endsAt, sound]);

  if (endsAt === null) return null;
  const progress = total ? 1 - remaining / total : 1;

  return (
    <div className={`rest-timer ${done ? 'is-done' : ''}`} role="timer" aria-live="off">
      <div className="rest-progress" style={{ transform: `scaleX(${progress})` }} />
      <div className="rest-label">
        <Timer size={18} />
        <span className="eyebrow">{done ? 'Repos terminé' : 'Repos'}</span>
      </div>
      <strong className="rest-clock tabular">{formatClock(Math.ceil(remaining))}</strong>
      <div className="rest-actions">
        <button className="icon-btn" onClick={() => adjustRest(-15)} aria-label="Retirer 15 secondes">
          <Minus size={18} />
        </button>
        <button className="icon-btn" onClick={() => adjustRest(15)} aria-label="Ajouter 15 secondes">
          <Plus size={18} />
        </button>
        <button className="icon-btn" onClick={stopRest} aria-label="Passer le repos">
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}
