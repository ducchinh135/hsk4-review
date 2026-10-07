import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccountBar from './components/AccountBar.jsx';
import AudioBar from './components/AudioBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import FilterBar from './components/FilterBar.jsx';
import LessonTabs from './components/LessonTabs.jsx';
import Study from './components/Study.jsx';
import { useAccount } from './hooks/useAccount.js';
import { useMarks } from './hooks/useMarks.js';
import { useSrs } from './hooks/useSrs.js';
import { useSpeech } from './hooks/useSpeech.js';
import { LESSON_COLORS, LESSON_ORDER, VOCAB } from './lessons.js';

const FILTER_KEY = 'hsk4_filter';
const FILTERS = ['all', 'new', 'r', 'k'];
const MODES = [
  ['cards', '📇 Thẻ từ vựng'],
  ['review', '🔀 Ôn tập xáo trộn'],
  ['fill', '✏️ Điền từ vào chỗ trống'],
];

function loadFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return FILTERS.includes(f) ? f : 'all';
  } catch {
    return 'all';
  }
}

export default function App() {
  const [lesson, setLesson] = useState(LESSON_ORDER[0]);
  const [mode, setMode] = useState('cards');
  const [filter, setFilter] = useState(loadFilter);
  const [authMode, setAuthMode] = useState(null); // null = modal closed
  // Bumped whenever the study view must be rebuilt (lesson/filter picked, marks replaced).
  // Marking a word does NOT bump it, so a card stays put after you mark it.
  const [viewVersion, setViewVersion] = useState(0);
  const refreshView = useCallback(() => setViewVersion((v) => v + 1), []);

  const syncRef = useRef(() => {});
  const marks = useMarks(() => syncRef.current());
  const srs = useSrs(() => syncRef.current());
  const speech = useSpeech();
  const account = useAccount({
    getMarks: marks.getAll,
    mergeServer: marks.mergeServer,
    clearMarks: marks.clearAll,
    getSrs: srs.getAll,
    mergeSrs: srs.mergeServer,
    clearSrs: srs.clearAll,
    onReplaced: refreshView,
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
  const selectMode = (m) => {
    speech.cancel();
    setMode(m);
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

  return (
    <>
      <AccountBar account={account} onLogin={() => setAuthMode('login')} />

      <header>
        <h1>📇 Thẻ Từ Vựng HSK4</h1>
        <p>Giáo trình HSK4 chuẩn — Bài 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 · 汉字 · Pinyin · Nghĩa · Ví dụ</p>
      </header>

      <LessonTabs lesson={lesson} getMark={marks.getMark} onSelect={selectLesson} />
      <div className="lesson-title" style={{ color: color.a }}>
        {VOCAB[lesson].title}
      </div>

      <AudioBar speech={speech} />
      <FilterBar counts={counts} filter={filter} fellBack={fellBack} onFilter={applyFilter} onReset={resetMarks} />

      <div className="mode-tabs">
        {MODES.map(([m, label]) => (
          <button key={m} className={'mode-tab' + (m === mode ? ' active' : '')} onClick={() => selectMode(m)}>
            {label}
          </button>
        ))}
      </div>

      <Study key={viewVersion} mode={mode} lesson={lesson} words={words} lessonWords={lessonWords} marks={marks} speech={speech} />

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} authenticate={account.authenticate} />}

      <footer>Được biên soạn từ nội dung HSK Standard Course 4 — Bài 1, 2, 3, 4, 5, 6, 7, 8, 9, 10</footer>
    </>
  );
}
