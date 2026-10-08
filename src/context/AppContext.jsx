import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from '../hooks/useAccount.js';
import { useMarks } from '../hooks/useMarks.js';
import { useSpeech } from '../hooks/useSpeech.js';
import { useSrs } from '../hooks/useSrs.js';
import { ALL_HANZI, LESSON_COLORS, LESSON_ORDER, VOCAB } from '../lessons.js';
import { queueCounts, today } from '../srs.js';

const FILTER_KEY = 'hsk4_filter';
const FILTERS = ['all', 'new', 'r', 'k'];

function loadFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return FILTERS.includes(f) ? f : 'all';
  } catch {
    return 'all';
  }
}

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// State shared by every page: progress hooks, account sync, the chosen lesson and filter.
export function AppProvider({ children }) {
  const [lesson, setLesson] = useState(LESSON_ORDER[0]);
  const [filter, setFilter] = useState(loadFilter);
  const syncRef = useRef(() => {});
  const marks = useMarks(() => syncRef.current());
  const srs = useSrs(() => syncRef.current());
  const speech = useSpeech();

  // Bumped whenever page views must be rebuilt (lesson/filter picked, marks replaced).
  // Marking a word does NOT bump it, so a card or row stays put after you mark it.
  const [viewVersion, setViewVersion] = useState(0);
  const builtWith = useRef(null); // the marks the current views were built from
  const refreshView = useCallback(() => {
    builtWith.current = JSON.stringify(marks.markRef.current);
    setViewVersion((v) => v + 1);
  }, [marks.markRef]);
  if (builtWith.current === null) builtWith.current = JSON.stringify(marks.markRef.current);
  // The account hook reports a wholesale replace after every login, logout and the first sync of a
  // page load. Rebuild only if the marks really changed, so a run or a typed answer already in
  // progress is not thrown away when a sync that changed nothing lands a moment after load.
  const onReplaced = useCallback(() => {
    if (JSON.stringify(marks.markRef.current) !== builtWith.current) refreshView();
  }, [marks.markRef, refreshView]);

  const account = useAccount({
    getMarks: marks.getAll,
    mergeServer: marks.mergeServer,
    clearMarks: marks.clearAll,
    getSrs: srs.getAll,
    mergeSrs: srs.mergeServer,
    clearSrs: srs.clearAll,
    onReplaced,
  });
  syncRef.current = account.scheduleSync;

  const lessonWords = VOCAB[lesson].words;
  const { words, fellBack } = useMemo(() => {
    const m = marks.markRef.current;
    const mark = (w) => (m[w[0]] && m[w[0]].s) || '';
    const list = lessonWords.filter((w) => filter === 'all' || (filter === 'new' && mark(w) === '') || mark(w) === filter);
    return list.length ? { words: list, fellBack: false } : { words: lessonWords, fellBack: true };
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonWords, filter, viewVersion]);

  const counts = useMemo(() => {
    let k = 0;
    let r = 0;
    lessonWords.forEach((w) => {
      const m = marks.getMark(w[0]);
      if (m === 'k') k++;
      else if (m === 'r') r++;
    });
    return { n: lessonWords.length, k, r, fresh: lessonWords.length - k - r };
  }, [lessonWords, marks.getMark]);

  // The study day changes at 4am; a tab left open overnight must notice.
  const [day, setDay] = useState(today);
  useEffect(() => {
    const tick = () => setDay(today());
    const onVisible = () => !document.hidden && tick();
    const id = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  // Recomputed whenever a card changes or the day rolls over, so the counts stay current.
  const srsCounts = useMemo(() => queueCounts(srs.srs, ALL_HANZI, day, srs.newPerDay), [srs.srs, srs.newPerDay, day]);

  const color = LESSON_COLORS[lesson];
  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--accent-a', color.a);
    s.setProperty('--accent-b', color.b);
    s.setProperty('--accent-bg', color.bg);
    s.setProperty('--accent', color.a);
  }, [color]);

  const selectLesson = (l) => {
    speech.cancel();
    setLesson(l);
    refreshView();
  };
  const applyFilter = (f) => {
    setFilter(f);
    try {
      localStorage.setItem(FILTER_KEY, f);
    } catch {
      /* ignore */
    }
    refreshView();
  };
  const resetMarks = () => {
    marks.clearWords(lessonWords.map((w) => w[0]));
    applyFilter('all');
  };

  const value = { marks, srs, speech, account, lesson, selectLesson, filter, applyFilter, resetMarks, viewVersion, words, fellBack, lessonWords, counts, srsCounts };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
