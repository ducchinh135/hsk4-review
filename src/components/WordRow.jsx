const MARKS = [
  ['k', '✅ Đã thuộc'],
  ['r', '🔁 Cần ôn lại'],
];

// One word in the list. The word area expands to show the example sentence; the buttons on the
// right speak the word and toggle the known / needs-review marks.
export default function WordRow({ word, mark, open, onToggleOpen, onMark, speech }) {
  const [hanzi, pinyin, meaning, zh, vi, phrases = [], extraSentences = []] = word;
  const wordId = 'row-' + hanzi;
  const speaking = (id) => (speech.speakingId === id ? ' speaking' : '');
  const cls = 'word-row' + (open ? ' open' : '') + (mark === 'k' ? ' is-known' : mark === 'r' ? ' is-review' : '');
  const allSentences = [[zh, vi], ...extraSentences];

  return (
    <div className={cls}>
      <div className="word-main">
        <button type="button" className="word-toggle" aria-expanded={open} onClick={onToggleOpen}>
          <span className="word-hanzi">{hanzi}</span>
          <span className="word-text">
            <span className="word-pinyin">{pinyin}</span>
            <span className="word-meaning">{meaning}</span>
          </span>
        </button>
        <div className="word-actions">
          {speech.supported && (
            <button type="button" className={'speak-btn mini' + speaking(wordId)} aria-label={'Nghe ' + hanzi} onClick={() => speech.speak(hanzi, wordId)}>
              🔊
            </button>
          )}
          {MARKS.map(([s, label]) => (
            <button key={s} type="button" className={'mark-btn' + (mark === s ? ' active' : '')} data-s={s} onClick={() => onMark(s)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="word-detail">
          {phrases.length > 0 && (
            <div className="word-phrases">
              {phrases.map(([ph, py, m], i) => {
                const phId = wordId + '-p' + i;
                return (
                  <button
                    key={ph}
                    type="button"
                    className={'phrase-chip' + speaking(phId)}
                    onClick={() => speech.supported && speech.speak(ph, phId)}
                  >
                    <b>{ph}</b> ({py}) — {m}
                  </button>
                );
              })}
            </div>
          )}
          {allSentences.map(([sZh, sVi], i) => {
            const sId = wordId + (i === 0 ? '-s' : '-s' + i);
            return (
              <div key={i} className="word-sentence-item">
                <div className="zh">{sZh}</div>
                <div className="vi">{sVi}</div>
                {speech.supported && (
                  <button type="button" className={'speak-btn mini' + speaking(sId)} onClick={() => speech.speak(sZh, sId)}>
                    🔊 Nghe câu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
