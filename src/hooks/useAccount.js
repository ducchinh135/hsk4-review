import { useCallback, useEffect, useRef, useState } from 'react';

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON (e.g. static host without a backend) */
  }
  return { ok: res.ok, status: res.status, data };
}

const LOCAL_ONLY = 'Tiến độ đang lưu trên máy này';

// Account + background sync. Hidden (`available` false) when there is no backend.
//  getMarks():       current marks to push
//  mergeServer(m):   fold server marks into local state
//  clearMarks():     wipe local marks (on logout, shared browsers)
//  onReplaced():     marks changed wholesale, redraw the study view
export function useAccount({ getMarks, mergeServer, clearMarks, onReplaced }) {
  const [available, setAvailable] = useState(false);
  const [user, setUserState] = useState(null);
  const [status, setStatus] = useState({ text: '', warn: false });

  const userRef = useRef(null);
  const timer = useRef(null);
  const retry = useRef(null);
  const syncing = useRef(false);
  const pending = useRef(false);
  const deps = useRef({});
  deps.current = { getMarks, mergeServer, clearMarks, onReplaced };

  const setUser = (u) => {
    userRef.current = u;
    setUserState(u);
  };
  const say = (text, warn = false) => setStatus({ text, warn });

  const doSync = useRef();
  doSync.current = async (first) => {
    if (!userRef.current) return;
    if (syncing.current) {
      pending.current = true;
      return;
    }
    syncing.current = true;
    pending.current = false;
    say('☁ Đang đồng bộ…');
    try {
      const r = await api('POST', '/api/sync', { marks: deps.current.getMarks() });
      if (r.status === 401) {
        setUser(null);
        say('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.', true);
        return;
      }
      if (!r.ok) throw new Error('sync ' + r.status);
      deps.current.mergeServer(r.data.marks || {});
      if (first) deps.current.onReplaced();
      say('☁ Đã đồng bộ');
      clearTimeout(retry.current);
      retry.current = null;
    } catch {
      say('⚠️ Chưa đồng bộ được, sẽ thử lại', true);
      clearTimeout(retry.current);
      retry.current = setTimeout(() => doSync.current(false), 15000);
    } finally {
      syncing.current = false;
      if (pending.current) doSync.current(false);
    }
  };

  // Debounced push after a local edit.
  const scheduleSync = useCallback(() => {
    if (!userRef.current) return;
    say('☁ Chờ đồng bộ…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSync.current(false), 800);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api('GET', '/api/me');
        if (cancelled || !r.ok || !r.data || !('user' in r.data)) return; // no backend: stay local-only
        setAvailable(true);
        setUser(r.data.user);
        if (r.data.user) doSync.current(true);
      } catch {
        /* offline or no backend */
      }
    })();
    const onOnline = () => userRef.current && doSync.current(false);
    const onVisible = () => !document.hidden && userRef.current && doSync.current(false);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      clearTimeout(retry.current);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Returns an error message, or null on success.
  const authenticate = useCallback(async (mode, body) => {
    try {
      const r = await api('POST', mode === 'register' ? '/api/register' : '/api/login', body);
      if (!r.ok) return (r.data && r.data.error) || 'Có lỗi xảy ra, thử lại sau.';
      setUser(r.data.user);
      say('');
      doSync.current(true); // pull this account's marks and push local ones
      return null;
    } catch {
      return 'Không kết nối được máy chủ.';
    }
  }, []);

  const logout = useCallback(async () => {
    clearTimeout(timer.current);
    clearTimeout(retry.current);
    if (userRef.current) await doSync.current(false); // push anything unsent before leaving
    try {
      await api('POST', '/api/logout', {});
    } catch {
      /* cookie expires on its own */
    }
    setUser(null);
    say('');
    deps.current.clearMarks(); // do not leave this account's progress on a shared browser
    deps.current.onReplaced();
  }, []);

  return {
    available,
    user,
    statusText: status.text || (user ? '' : LOCAL_ONLY),
    statusWarn: status.warn,
    authenticate,
    logout,
    scheduleSync,
  };
}
