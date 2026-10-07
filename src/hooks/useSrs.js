import { useCallback, useRef, useState } from 'react';
import { DEFAULT_NEW_PER_DAY, clampNewPerDay, lapse as lapseCard, schedule, today } from '../srs.js';

const SRS_KEY = 'hsk4_srs_v1';
const NEW_KEY = 'hsk4_srs_new_per_day';

// srs: hanzi -> card (see src/srs.js) + `t` edit time (ms). Persisted in localStorage like marks;
// `onLocalChange` fires after every local edit so the account hook can sync.
function load() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function loadNewPerDay() {
  try {
    const v = localStorage.getItem(NEW_KEY);
    return v === null ? DEFAULT_NEW_PER_DAY : clampNewPerDay(v);
  } catch {
    return DEFAULT_NEW_PER_DAY;
  }
}

export function useSrs(onLocalChange) {
  const [srs, setSrs] = useState(load);
  const [newPerDay, setNew] = useState(loadNewPerDay);
  const ref = useRef(srs); // always the latest, for callbacks that must not go stale
  const changed = useRef(onLocalChange);
  changed.current = onLocalChange;

  const commit = useCallback((next) => {
    ref.current = next;
    setSrs(next);
    try {
      localStorage.setItem(SRS_KEY, JSON.stringify(next));
    } catch {
      /* private mode / quota: keep working in memory */
    }
  }, []);

  const put = useCallback(
    (h, card) => {
      const prev = ref.current[h];
      const { t: _drop, ...fields } = card;
      commit({ ...ref.current, [h]: { ...fields, t: Math.max(Date.now(), prev ? prev.t + 1 : 0) } });
      changed.current?.();
    },
    [commit]
  );

  const getCard = useCallback((h) => srs[h], [srs]);

  // Grade the card; returns how many cards later it should come back this session (0 = not again).
  const review = useCallback(
    (h, grade) => {
      const { card, requeue } = schedule(ref.current[h], grade, today());
      put(h, card);
      return requeue;
    },
    [put]
  );

  // Wrong quiz answer: due today. Skips the write when nothing would change.
  const lapse = useCallback(
    (h) => {
      const prev = ref.current[h];
      const next = lapseCard(prev, today());
      if (prev && prev.due === next.due && prev.ivl === next.ivl) return;
      put(h, next);
    },
    [put]
  );

  // Undo: put a card back the way it was (with a fresh edit time so the undo syncs too).
  const restore = useCallback((h, card) => put(h, card), [put]);

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

  const setNewPerDay = useCallback((v) => {
    const n = clampNewPerDay(v);
    setNew(n);
    try {
      localStorage.setItem(NEW_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, []);

  return { srs, getCard, review, lapse, restore, mergeServer, clearAll, getAll, newPerDay, setNewPerDay };
}
