import { useImperativeHandle, useState } from 'react';

const STATUS_TEXT = { k: '✅ Đã thuộc', r: '🔁 Cần ôn lại' };

// One flashcard. Remount it (via `key`) to show it unflipped.
export default function FlipCard({ word, hint, id, mark, onMark, speech, flipRef, actions }) {
  const [flipped, setFlipped] = useState(false);
  useImperativeHandle(flipRef, () => ({ toggle: () => setFlipped((f) => !f), isFlipped: () => flipped }), [flipped]);
  const sp = (text, part) => (e) => {
    e.stopPropagation(); // do not flip the card
    speech.speak(text, id + part);
  };
  const cls = (part, base) => base + (speech.speakingId === id + part ? ' speaking' : '');

  return (
    <div className={'flip-card' + (flipped ? ' flipped' : '')} onClick={() => setFlipped((f) => !f)}>
      <div className="flip-inner">
        <div className="face face-front">
          <span className="status-chip">{STATUS_TEXT[mark] || ''}</span>
          {speech.supported && (
            <button className={cls('front', 'speak-btn front')} aria-label="Phát âm từ" title="Nghe phát âm" onClick={sp(word[0], 'front')}>
              🔊
            </button>
          )}
          <div className="hanzi-big">{word[0]}</div>
          <div className="hint">{hint}</div>
        </div>
        <div className="face face-back">
          <div className="back-pinyin">{word[1]}</div>
          <div className="back-meaning">{word[2]}</div>
          {speech.supported && (
            <div className="speak-row">
              <button className={cls('word', 'speak-btn mini')} onClick={sp(word[0], 'word')}>
                🔊 Nghe từ
              </button>
              <button className={cls('sentence', 'speak-btn mini')} onClick={sp(word[3], 'sentence')}>
                🔊 Nghe câu
              </button>
            </div>
          )}
          {actions ?? (
            <div className="mark-row">
              {['k', 'r'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={'mark-btn' + (mark === s ? ' active' : '')}
                  data-s={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMark(s);
                  }}
                >
                  {STATUS_TEXT[s]}
                </button>
              ))}
            </div>
          )}
          <div className="back-example">
            <div className="zh">{word[3]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
