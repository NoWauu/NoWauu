import { useEffect } from 'react';

/** Keeps the screen on while `active` (during a workout), where supported. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        // Denied (low battery, unsupported context): not critical.
      }
    };
    // The lock is dropped whenever the page is hidden; take it back on return.
    const onVisible = () => document.visibilityState === 'visible' && request();
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
