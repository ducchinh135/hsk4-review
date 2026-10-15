import { useEffect, useMemo, useRef, useState } from 'react';
import ComparePair from '../components/ComparePair.jsx';
import LessonTabs from '../components/LessonTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  COMPARE_FILTERS,
  PAIR_BY_ID,
  compareKey,
  compareProgress,
  countPairs,
  filterPairs,
  lessonOf,
  loadCompareFilter,
  pairsOf,
  reviewPairs,
  saveCompareFilter,
  searchPairs,
} from '../compare.js';
import { LESSON_COLORS, LESSON_LABELS, VOCAB } from '../lessons.js';
import { Link } from '../router.jsx';

// The group named by the URL hash (/compare#1.3), if it exists.
function hashPair() {
  try {
    const id = decodeURIComponent(window.location.hash.slice(1));
    return PAIR_BY_ID[id] ? id : null;
  } catch {
    return null;
  }
}

// The confusable-word groups of the chosen lesson, filtered by mark, or the search results over every
// lesson. A /compare#<id> link (from a practice run) switches to that group's lesson, shows and opens
// it even if the filter hides it, and scrolls to it.
export default function ComparePage() {
  const { lesson, selectLesson, marks, speech, viewVersion } = useApp();
  const { getMark, toggleMark, markRef } = marks;
  const [filter, setFilter] = useState(loadCompareFilter);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(hashPair);
  const [open, setOpen] = useState(() => new Set(target ? [target] : []));
  const scrolled = useRef(false);

  useEffect(() => {
    if (target && lessonOf(target) !== lesson) selectLesson(lessonOf(target));
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // navigate() has already scrolled to the top, so scroll once the target card is rendered.
  useEffect(() => {
    if (!target || scrolled.current || lessonOf(target) !== lesson) return;
    scrolled.current = true;
    document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, [target, lesson]);

  const all = pairsOf(lesson);
  // Rebuilt when the lesson, filter or account data changes, not on every mark, so a card does not
  // vanish right after you mark it.
  const { points: pairs, fellBack } = useMemo(() => {
    const m = markRef.current;
    const res = filterPairs(all, filter, (k) => (m[k] && m[k].s) || '');
    if (target && lessonOf(target) === lesson && !res.points.some((p) => p.id === target)) {
      return { points: all.filter((p) => p.id === target || res.points.includes(p)), fellBack: res.fellBack };
    }
    return res;
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, target, lesson, viewVersion]);

  const searching = query.trim() !== '';
  const results = useMemo(() => (searching ? searchPairs(query) : []), [searching, query]);

  const counts = countPairs(all, getMark);
  const n = { all: counts.n, new: counts.fresh, r: counts.r, k: counts.k };
  const reviewCount = reviewPairs(getMark).length;

  const pickFilter = (f) => {
    setFilter(f);
    saveCompareFilter(f);
    setTarget(null);
  };
  const pickLesson = (l) => {
    setTarget(null);
    setQuery('');
    selectLesson(l);
  };
  const toggleOpen = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const card = (p, lessonLabel) => (
    <ComparePair
      key={p.id}
      pair={p}
      mark={getMark(compareKey(p.id))}
      open={open.has(p.id)}
      onToggleOpen={() => toggleOpen(p.id)}
      onMark={(s) => toggleMark(compareKey(p.id), s)}
      speech={speech}
      lessonLabel={lessonLabel}
    />
  );

  return (
    <div className="panel">
      <LessonTabs lesson={lesson} getMark={getMark} onSelect={pickLesson} progress={compareProgress(getMark)} />
      <div className="cp-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm từ trên cả 20 bài: 刚才, gangcai…"
          aria-label="Tìm nhóm từ"
        />
      </div>
      {searching ? (
        <>
          <div className="filter-note">
            {results.length ? `${results.length} nhóm khớp “${query.trim()}” trên cả 20 bài` : 'Không tìm thấy nhóm nào.'}
          </div>
          <div className="grammar-list">{results.map((p) => card(p, LESSON_LABELS[lessonOf(p.id)]))}</div>
        </>
      ) : (
        <>
          <div className="lesson-title" style={{ color: LESSON_COLORS[lesson].a }}>
            {VOCAB[lesson].title}
          </div>
          {all.length > 0 && (
            <div className="filter-bar">
              <div className="filter-chips" role="group" aria-label="Lọc nhóm từ theo trạng thái">
                {COMPARE_FILTERS.map(([f, label]) => (
                  <button key={f} type="button" className={'chip' + (f === filter ? ' active' : '')} onClick={() => pickFilter(f)}>
                    {label}
                    <span className="n">{n[f]}</span>
                  </button>
                ))}
              </div>
              {fellBack && <div className="audio-note filter-note">Chưa có nhóm nào ở mục này nên đang hiện cả bài.</div>}
              <div className="filter-tools">
                <span>
                  Đã nắm {counts.k}/{counts.n} nhóm từ của bài này
                </span>
              </div>
            </div>
          )}
          <div className="grammar-actions">
            {all.length > 0 && (
              <Link to="/compare/practice" className="btn">
                📝 Luyện tập bài này
              </Link>
            )}
            {reviewCount > 0 && (
              <Link to="/compare/review" className="btn secondary">
                🔁 Ôn các nhóm cần ôn ({reviewCount})
              </Link>
            )}
          </div>
          {all.length === 0 ? (
            <div className="grammar-empty">Nội dung bài này đang được soạn.</div>
          ) : (
            <div className="grammar-list">{pairs.map((p) => card(p))}</div>
          )}
        </>
      )}
    </div>
  );
}
