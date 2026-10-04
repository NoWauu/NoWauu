import { createStore } from './createStore';

// Ephemeral UI state shared across pages (not persisted, except the rest timer
// which survives a reload so you don't lose your countdown).

// ------------------------------------------------------------- Rest timer

export interface RestState {
  endsAt: number | null;
  total: number;
}

export const restStore = createStore<RestState>(
  { endsAt: null, total: 0 },
  { key: 'nowauu-rest', migrate: (r) => r as RestState },
);

export function startRest(seconds: number) {
  restStore.set(() => ({ endsAt: Date.now() + seconds * 1000, total: seconds }));
}

export function adjustRest(delta: number) {
  restStore.set((s) => {
    if (!s.endsAt) return s;
    const endsAt = Math.max(Date.now(), s.endsAt + delta * 1000);
    return { endsAt, total: Math.max(1, s.total + delta) };
  });
}

export function stopRest() {
  restStore.set(() => ({ endsAt: null, total: 0 }));
}

// --------------------------------------------------------------- Dialogs

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export const confirmStore = createStore<ConfirmRequest | null>(null);

/** Promise-based replacement for window.confirm, rendered as a bottom sheet. */
export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => confirmStore.set(() => ({ ...opts, resolve })));
}

// ----------------------------------------------------------------- Toasts

export const toastStore = createStore<{ id: number; text: string } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string) {
  clearTimeout(toastTimer);
  toastStore.set(() => ({ id: Date.now(), text }));
  toastTimer = setTimeout(() => toastStore.set(() => null), 2600);
}

// --------------------------------------------------- Post-workout summary

export const summaryStore = createStore<string | null>(null);
