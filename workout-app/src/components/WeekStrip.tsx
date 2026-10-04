import { addDays } from '../domain/volume';
import type { Workout } from '../domain/types';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Monday → Sunday dots: filled on training days, ringed today. */
export function WeekStrip({ weekStart, workouts }: { weekStart: Date; workouts: Workout[] }) {
  const today = new Date().toDateString();
  return (
    <div className="week-strip">
      {DAYS.map((label, i) => {
        const day = addDays(weekStart, i);
        const n = workouts.filter((w) => new Date(w.startedAt).toDateString() === day.toDateString()).length;
        return (
          <div key={i} className={`week-day ${n ? 'is-trained' : ''} ${day.toDateString() === today ? 'is-today' : ''}`}>
            <span className="week-day-label">{label}</span>
            <span className="week-day-dot" aria-label={`${day.toLocaleDateString('fr-FR', { weekday: 'long' })} : ${n} séance(s)`}>
              {day.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
