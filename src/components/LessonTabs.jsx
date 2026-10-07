import { LESSON_LABELS, LESSON_ORDER, VOCAB } from '../lessons.js';

export default function LessonTabs({ lesson, getMark, onSelect }) {
  return (
    <div className="lesson-tabs">
      {LESSON_ORDER.map((l) => {
        const ws = VOCAB[l].words;
        const known = ws.filter((w) => getMark(w[0]) === 'k').length;
        return (
          <button key={l} className={'lesson-tab' + (l === lesson ? ' active' : '')} data-l={l} onClick={() => onSelect(l)}>
            <span>{LESSON_LABELS[l]}</span>
            <span className="tab-sub">
              {known}/{ws.length} ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
