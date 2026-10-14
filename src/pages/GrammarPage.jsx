import { useEffect, useMemo, useRef, useState } from 'react';
import GrammarPoint from '../components/GrammarPoint.jsx';
import LessonTabs from '../components/LessonTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  GRAMMAR_FILTERS,
  POINT_BY_ID,
  countPoints,
  filterPoints,
  grammarKey,
  grammarProgress,
  lessonOf,
  loadGrammarFilter,
  pointsOf,
  reviewPoints,
  saveGrammarFilter,
} from '../grammar.js';
import { LESSON_COLORS, VOCAB } from '../lessons.js';
import { Link } from '../router.jsx';

// The point named by the URL hash (/grammar#1.3), if it exists.
function hashPoint() {
  try {
    const id = decodeURIComponent(window.location.hash.slice(1));
    return POINT_BY_ID[id] ? id : null;
  } catch {
    return null;
  }
}

// The grammar points of the chosen lesson, filtered by mark. A /grammar#<id> link (from a practice
// run) switches to that point's lesson, shows and opens it even if the filter hides it, and scrolls to it.
export default function GrammarPage() {
  const { lesson, selectLesson, marks, speech, viewVersion } = useApp();
  const { getMark, toggleMark, markRef } = marks;
  const [filter, setFilter] = useState(loadGrammarFilter);
  const [target, setTarget] = useState(hashPoint);
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

  const all = pointsOf(lesson);
  // Rebuilt when the lesson, filter or account data changes, not on every mark, so a card does not
  // vanish right after you mark it.
  const { points, fellBack } = useMemo(() => {
    const m = markRef.current;
    const res = filterPoints(all, filter, (k) => (m[k] && m[k].s) || '');
    if (target && lessonOf(target) === lesson && !res.points.some((p) => p.id === target)) {
      return { points: all.filter((p) => p.id === target || res.points.includes(p)), fellBack: res.fellBack };
    }
    return res;
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, target, lesson, viewVersion]);

  const counts = countPoints(all, getMark);
  const n = { all: counts.n, new: counts.fresh, r: counts.r, k: counts.k };
  const reviewCount = reviewPoints(getMark).length;

  const pickFilter = (f) => {
    setFilter(f);
    saveGrammarFilter(f);
    setTarget(null);
  };
  const pickLesson = (l) => {
    setTarget(null);
    selectLesson(l);
  };
  const toggleOpen = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="panel">
      <LessonTabs lesson={lesson} getMark={getMark} onSelect={pickLesson} progress={grammarProgress(getMark)} />
      <div className="lesson-title" style={{ color: LESSON_COLORS[lesson].a }}>
        {VOCAB[lesson].title}
      </div>
      {all.length > 0 && (
        <div className="filter-bar">
          <div className="filter-chips" role="group" aria-label="Lọc điểm ngữ pháp theo trạng thái">
            {GRAMMAR_FILTERS.map(([f, label]) => (
              <button key={f} className={'chip' + (f === filter ? ' active' : '')} onClick={() => pickFilter(f)}>
                {label}
                <span className="n">{n[f]}</span>
              </button>
            ))}
          </div>
          {fellBack && <div className="audio-note filter-note">Chưa có điểm nào ở mục này nên đang hiện cả bài.</div>}
          <div className="filter-tools">
            <span>
              Đã nắm {counts.k}/{counts.n} điểm ngữ pháp của bài này
            </span>
          </div>
        </div>
      )}
      <div className="grammar-actions">
        {all.length > 0 && (
          <Link to="/grammar/practice" className="btn">
            📝 Luyện tập bài này
          </Link>
        )}
        {reviewCount > 0 && (
          <Link to="/grammar/review" className="btn secondary">
            🔁 Ôn các điểm cần ôn ({reviewCount})
          </Link>
        )}
      </div>
      {all.length === 0 ? (
        <div className="grammar-empty">Nội dung bài này đang được soạn.</div>
      ) : (
        <div className="grammar-list">
          {points.map((p) => (
            <GrammarPoint
              key={p.id}
              point={p}
              mark={getMark(grammarKey(p.id))}
              open={open.has(p.id)}
              onToggleOpen={() => toggleOpen(p.id)}
              onMark={(s) => toggleMark(grammarKey(p.id), s)}
              speech={speech}
            />
          ))}
        </div>
      )}
    </div>
  );
}
