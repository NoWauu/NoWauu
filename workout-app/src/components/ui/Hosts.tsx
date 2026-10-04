import { CircleCheck } from 'lucide-react';
import { confirmStore, toastStore } from '../../storage/ui';
import { Sheet } from './Sheet';

/** Renders the pending confirmDialog() request, if any. */
export function ConfirmHost() {
  const req = confirmStore.use((s) => s);
  const answer = (ok: boolean) => {
    req?.resolve(ok);
    confirmStore.set(() => null);
  };
  return (
    <Sheet open={!!req} onClose={() => answer(false)}>
      {req && (
        <div className="confirm">
          <h2>{req.title}</h2>
          {req.message && <p className="text-2">{req.message}</p>}
          <div className="confirm-actions">
            <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'} btn-lg`} onClick={() => answer(true)}>
              {req.confirmLabel}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => answer(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function ToastHost() {
  const t = toastStore.use((s) => s);
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <CircleCheck size={18} />
      {t.text}
    </div>
  );
}
