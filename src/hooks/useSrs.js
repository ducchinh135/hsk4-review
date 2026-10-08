import { useCallback, useRef, useState } from 'react';
import { enroll as enrollCard, known as knownCard, lapse as lapseCard, schedule, today } from '../srs.js';

const SRS_KEY = 'hsk4_srs_v1';

// srs: hanzi -> card (see src/srs.js) + `t` edit time (ms). Persisted in localStorage like marks;
// `onLocalChange` fires after every local edit so the account hook can sync.
function load() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function useSrs(onLocalChange) {
  const [srs, setSrs] = useState(load);
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

  // Add words to the schedule (due today) in one write; words that already have a card are skipped.
  const enroll = useCallback(
    (hanzi) => {
      const day = today();
      const t = Date.now();
      const next = { ...ref.current };
      let n = 0;
      hanzi.forEach((h) => {
        if (!next[h]) {
          next[h] = { ...enrollCard(undefined, day), t };
          n++;
        }
      });
      if (!n) return 0;
      commit(next);
      changed.current?.();
      return n;
    },
    [commit]
  );

  // The word was marked "known": if it has no card yet, schedule it a week out.
  const markKnown = useCallback(
    (h) => {
      if (!ref.current[h]) put(h, knownCard(undefined, today()));
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

  return { srs, getCard, review, lapse, restore, mergeServer, clearAll, getAll, enroll, markKnown };
}
