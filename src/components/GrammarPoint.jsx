const MARKS = [
  ['k', '✅ Đã nắm'],
  ['r', '🔁 Cần ôn'],
];

// One grammar point. The title row toggles the details: pattern, meaning, examples (with speech),
// notes and the known / needs-review marks. The element id is the point id, for /grammar#1.3 links.
export default function GrammarPoint({ point, mark, open, onToggleOpen, onMark, speech }) {
  const cls = 'word-row' + (open ? ' open' : '') + (mark === 'k' ? ' is-known' : mark === 'r' ? ' is-review' : '');
  const speaking = (id) => (speech.speakingId === id ? ' speaking' : '');
  return (
    <div id={point.id} className={cls}>
      <div className="word-main">
        <button type="button" className="word-toggle" aria-expanded={open} onClick={onToggleOpen}>
          <span className="gp-title">{point.title}</span>
          {mark && <span className={'gp-status ' + mark}>{mark === 'k' ? '✅ Đã nắm' : '🔁 Cần ôn'}</span>}
        </button>
      </div>
      {open && (
        <div className="word-detail">
          <div className="gp-pattern">{point.pattern}</div>
          <div className="gp-meaning">{point.meaning}</div>
          {point.examples.map(([zh, py, vi], i) => {
            const id = `gp-${point.id}-${i}`;
            return (
              <div key={i} className="word-sentence-item">
                <div className="zh">
                  {zh}
                  {speech.supported && (
                    <button type="button" className={'speak-btn mini' + speaking(id)} aria-label="Nghe câu" onClick={() => speech.speak(zh, id)}>
                      🔊
                    </button>
                  )}
                </div>
                <div className="gp-pinyin">{py}</div>
                <div className="vi">{vi}</div>
              </div>
            );
          })}
          {point.notes.length > 0 && (
            <div className="gp-notes">
              <div className="quiz-label">⚠️ Lưu ý</div>
              <ul>
                {point.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="word-actions">
            {MARKS.map(([s, label]) => (
              <button key={s} type="button" className={'mark-btn' + (mark === s ? ' active' : '')} data-s={s} onClick={() => onMark(s)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
