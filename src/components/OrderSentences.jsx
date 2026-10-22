import { LETTERS3, highlightClues, orderedSentences } from '../reading.js';

const arrow = (s) => [...s].join(' → ');

// One 排列顺序 question: three numbered slots filled in the order the sentences are tapped (tap a
// placed one to take it out), then the sentences still to place. After checking: right or wrong,
// the joined paragraph with the clue words marked, pinyin and translation per sentence and the
// three-step explanation. Holds no state: `picked` (sentence indexes in order) and `graded`
// ({given, ok} or null) live in the page.
export default function OrderSentences({ q, picked, graded, showPinyin, onTogglePinyin, onPick, onUnpick, onCheck }) {
  if (graded) {
    const ordered = orderedSentences(q);
    return (
      <div className="rd-set">
        <div className={'quiz-reveal ' + (graded.ok ? 'ok' : 'bad')}>
          {graded.ok ? `✓ Đúng: ${arrow(q.answer)}` : `✗ Bạn xếp: ${arrow(graded.given)} · Đúng: ${arrow(q.answer)}`}
          <button type="button" className="link-btn small" onClick={onTogglePinyin}>
            {showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin'}
          </button>
        </div>
        <p className="rd-para">
          {ordered.map((x, i) =>
            highlightClues(x.text, q.clues).map((piece, k) =>
              piece.hit ? (
                <mark key={i + ':' + k} className="rd-clue">
                  {piece.text}
                </mark>
              ) : (
                <span key={i + ':' + k}>{piece.text}</span>
              )
            )
          )}
        </p>
        <div className="rd-item-explain">
          {ordered.map((x, i) => (
            <div key={i} className="rd-sent-explain">
              <b>{q.answer[i]}</b> {showPinyin && <span className="py">{x.pinyin}</span>}
              <div className="quiz-reveal-sub">{x.vi}</div>
            </div>
          ))}
          <div className="quiz-reveal-sub">💡 Câu đầu: {q.explain.first}</div>
          <div className="quiz-reveal-sub">💡 Tiếp theo: {q.explain.next}</div>
          <div className="quiz-reveal-sub">💡 Cuối: {q.explain.last}</div>
        </div>
      </div>
    );
  }

  const sentence = (k) => (
    <>
      <b className="rd-letter">{LETTERS3[k]}</b> {q.sentences[k].text}
    </>
  );
  return (
    <div className="rd-set">
      <div className="rd-slots">
        {[0, 1, 2].map((i) =>
          picked[i] === undefined ? (
            <div key={i} className="rd-slot empty">
              {i + 1}
            </div>
          ) : (
            <button key={i} type="button" data-fill="" className="rd-slot" aria-label={`Gỡ câu ${LETTERS3[picked[i]]}`} onClick={() => onUnpick(picked[i])}>
              {sentence(picked[i])}
            </button>
          )
        )}
      </div>
      <div className="rd-pool">
        {[0, 1, 2]
          .filter((k) => !picked.includes(k))
          .map((k) => (
            <button key={k} type="button" data-fill="" className="rd-sent" onClick={() => onPick(k)}>
              {sentence(k)}
            </button>
          ))}
      </div>
      <div className="controls">
        <button type="button" className="btn" disabled={picked.length < 3} onClick={onCheck}>
          Kiểm tra
        </button>
      </div>
    </div>
  );
}
