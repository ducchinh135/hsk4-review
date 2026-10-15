const MARKS = [
  ['k', '✅ Đã nắm'],
  ['r', '🔁 Cần ôn'],
];

// The sentence with every occurrence of `word` in bold.
function highlight(zh, word) {
  return zh.split(word).flatMap((s, i) => (i ? [<b key={i}>{word}</b>, s] : [s]));
}

// One group of confusable words. The title row toggles the details: what they share, the comparison
// table (one column per word), examples per word (with speech), the tip and the marks. The element id
// is the group id, for /compare#1.3 links. `lessonLabel` is shown on search results.
export default function ComparePair({ pair, mark, open, onToggleOpen, onMark, speech, lessonLabel }) {
  const cls = 'word-row' + (open ? ' open' : '') + (mark === 'k' ? ' is-known' : mark === 'r' ? ' is-review' : '');
  const speakBtn = (text, id, label) =>
    speech.supported && (
      <button type="button" className={'speak-btn mini' + (speech.speakingId === id ? ' speaking' : '')} aria-label={label} onClick={() => speech.speak(text, id)}>
        🔊
      </button>
    );
  return (
    <div id={pair.id} className={cls}>
      <div className="word-main">
        <button type="button" className="word-toggle" aria-expanded={open} onClick={onToggleOpen}>
          <span className="cp-title">
            {pair.words.map(([hz, py], i) => (
              <span key={hz} className="cp-word">
                {i > 0 && <span className="cp-sep">⇄</span>}
                <span className="cp-hz">{hz}</span>
                <span className="cp-py">{py}</span>
              </span>
            ))}
          </span>
          {lessonLabel && <span className="cp-lesson">{lessonLabel}</span>}
          {mark && <span className={'gp-status ' + mark}>{mark === 'k' ? '✅ Đã nắm' : '🔁 Cần ôn'}</span>}
        </button>
      </div>
      {open && (
        <div className="word-detail">
          <div className="gp-meaning">{pair.common}</div>
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th scope="col">Tiêu chí</th>
                  {pair.words.map(([hz, py]) => (
                    <th key={hz} scope="col">
                      <span className="cp-hz">{hz}</span> {speakBtn(hz, `cp-${pair.id}-${hz}`, 'Nghe ' + hz)}
                      <div className="gp-pinyin">{py}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pair.rows.map(([label, ...cells], i) => (
                  <tr key={i}>
                    <th scope="row">{label}</th>
                    {cells.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pair.words.map(([hz], k) => (
            <div key={hz} className="cp-examples">
              <div className="quiz-label">Ví dụ với {hz}</div>
              {pair.examples.map(([zh, py, vi, w], i) =>
                w !== k ? null : (
                  <div key={i} className="word-sentence-item">
                    <div className="zh">
                      {highlight(zh, hz)}
                      {speakBtn(zh, `cp-${pair.id}-ex${i}`, 'Nghe câu')}
                    </div>
                    <div className="gp-pinyin">{py}</div>
                    <div className="vi">{vi}</div>
                  </div>
                )
              )}
            </div>
          ))}
          <div className="cp-tip">💡 {pair.tip}</div>
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
