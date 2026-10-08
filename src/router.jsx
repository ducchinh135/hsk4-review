import { useEffect, useSyncExternalStore } from 'react';
import { matchRoute } from './routes.js';

const listeners = new Set();
const subscribe = (cb) => {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
};
const getPath = () => window.location.pathname;

export function navigate(to, { replace = false } = {}) {
  if (to !== window.location.pathname) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
    if (!replace) window.scrollTo(0, 0);
  }
  listeners.forEach((cb) => cb());
}

// The page for the current URL. Unknown URLs are replaced (not pushed) with a real page, so Back
// never lands on a redirecting URL.
export function useRoute() {
  const pathname = useSyncExternalStore(subscribe, getPath);
  const route = matchRoute(pathname);
  useEffect(() => {
    if (route.path !== pathname) navigate(route.path, { replace: true });
  }, [route.path, pathname]);
  return route;
}

export function Link({ to, onClick, target, ...props }) {
  const click = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target) return;
    e.preventDefault();
    navigate(to);
  };
  return <a {...props} href={to} target={target} onClick={click} />;
}
