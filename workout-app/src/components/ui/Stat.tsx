import type { ReactNode } from 'react';

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">
        {icon}
        {label}
      </span>
      <strong className="stat-value tabular">{value}</strong>
    </div>
  );
}
