import { useSyncExternalStore } from 'react';

// Hash routing (#/exos/squat): works on any static host with zero server
// config, which is what lets the app be hosted for free.

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export function navigate(path: string) {
  window.location.hash = path;
}
