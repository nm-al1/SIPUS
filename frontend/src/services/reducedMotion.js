import { useSyncExternalStore } from 'react';

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(reducedMotionQuery).matches;

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
