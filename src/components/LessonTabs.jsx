import { LESSON_COLORS, LESSON_LABELS, LESSON_ORDER, VOCAB } from '../lessons.js';

// Known words of each lesson, the default progress shown under a tab.
const wordProgress = (getMark) => (l) => {
  const ws = VOCAB[l].words;
  return { done: ws.filter((w) => getMark(w[0]) === 'k').length, total: ws.length };
};

// `progress(lesson) -> { done, total }` overrides what the tabs count (e.g. grammar points); a
// lesson with nothing to count shows "—".
export default function LessonTabs({ lesson, getMark, onSelect, progress }) {
  const count = progress || wordProgress(getMark);
  return (
    <div className="lesson-tabs">
      {LESSON_ORDER.map((l) => {
        const { done, total } = count(l);
        return (
          <button key={l} className={'lesson-tab' + (l === lesson ? ' active' : '')} data-l={l}
            style={{ background: `linear-gradient(135deg,${LESSON_COLORS[l].a},${LESSON_COLORS[l].b})` }}
            onClick={() => onSelect(l)}>
            <span>{LESSON_LABELS[l]}</span>
            <span className="tab-sub">{total ? `${done}/${total} ✓` : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}
