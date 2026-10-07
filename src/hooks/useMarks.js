import { useCallback, useRef, useState } from 'react';

const MARKS_KEY = 'hsk4_marks_v1';

// marks: hanzi -> { s: 'k' | 'r' | '', t: epoch ms }. Persisted in localStorage;
// `onLocalChange` fires after every local edit so the account hook can sync.
function load() {
  try {
    return JSON.parse(localStorage.getItem(MARKS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function useMarks(onLocalChange) {
  const [marks, setMarks] = useState(load);
  const ref = useRef(marks); // always the latest, for callbacks that must not go stale
  const changed = useRef(onLocalChange);
  changed.current = onLocalChange;

  const commit = useCallback((next) => {
    ref.current = next;
    setMarks(next);
    try {
      localStorage.setItem(MARKS_KEY, JSON.stringify(next));
    } catch {
      /* private mode / quota: keep working in memory */
    }
  }, []);

  const getMark = useCallback((h) => (marks[h] && marks[h].s) || '', [marks]);

  const setMark = useCallback(
    (h, s) => {
      const prev = ref.current[h];
      commit({ ...ref.current, [h]: { s, t: Math.max(Date.now(), prev ? prev.t + 1 : 0) } });
      changed.current?.();
    },
    [commit]
  );

  const toggleMark = useCallback(
    (h, s) => setMark(h, ((ref.current[h] && ref.current[h].s) || '') === s ? '' : s),
    [setMark]
  );

  // Clear every mark for the given hanzi list (keeps tombstones so the clear syncs).
  const clearWords = useCallback(
    (hanzi) => {
      const t = Date.now();
      const next = { ...ref.current };
      hanzi.forEach((h) => {
        if (next[h] && next[h].s) next[h] = { s: '', t: Math.max(t, next[h].t + 1) };
      });
      commit(next);
      changed.current?.();
    },
    [commit]
  );

  // Fold the server's state in (newer timestamp wins per word).
  const mergeServer = useCallback(
    (server) => {
      const next = { ...ref.current };
      Object.keys(server).forEach((h) => {
        if (!next[h] || server[h].t >= next[h].t) next[h] = server[h];
      });
      commit(next);
    },
    [commit]
  );

  const clearAll = useCallback(() => commit({}), [commit]);
  const getAll = useCallback(() => ref.current, []);

  return { marks, getMark, setMark, toggleMark, clearWords, mergeServer, clearAll, getAll, markRef: ref };
}
