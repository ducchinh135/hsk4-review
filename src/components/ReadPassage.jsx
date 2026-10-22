import { useState } from 'react';
import { highlightClues } from '../reading.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// One 阅读理解 passage and its questions (one, or two for a long passage). Picking an answer grades
// that question at once: the buttons turn green/red, the deciding words in the passage are marked,
// and the question, the four answers (pinyin and meaning) and the explanation show. Pinyin of the
// passage can be shown at any time; its translation once every question is answered. Those two
// switches are not remembered: remount (via `key`) per passage. `answers` ({[i]: given}) lives in
// the page.
export default function ReadPassage({ p, answers, onAnswer }) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const done = p.questions.every((_, i) => answers[i] !== undefined);
  const marked = p.questions.flatMap((q, i) => (answers[i] !== undefined ? q.evidence : []));
  const many = p.questions.length > 1;

  return (
    <div className="rd-set">
      <div className="rd-passage-tools">
        <button type="button" className={'link-btn small' + (showPinyin ? ' active' : '')} onClick={() => setShowPinyin((v) => !v)}>
          {showPinyin ? 'Ẩn pinyin' : 'Pinyin'}
        </button>
        <button type="button" className="link-btn small" disabled={!done} title={done ? undefined : 'Trả lời hết các câu hỏi để xem bản dịch'} onClick={() => setShowVi((v) => !v)}>
          {showVi && done ? 'Ẩn dịch' : 'Dịch'}
        </button>
      </div>
      <div className="rd-passage">
        <div className="hz">
          {highlightClues(p.text, marked).map((piece, k) =>
            piece.hit ? (
              <mark key={k} className="rd-clue">
                {piece.text}
              </mark>
            ) : (
              <span key={k}>{piece.text}</span>
            )
          )}
        </div>
        {showPinyin && <div className="py">{p.pinyin}</div>}
        {showVi && done && <div className="vi">{p.vi}</div>}
      </div>

      {p.questions.map((q, i) => {
        const given = answers[i];
        const answered = given !== undefined;
        return (
          <div key={i} className="rd-q">
            <div className="rd-q-text">
              {many ? `${q.n ?? i + 1}. ` : '★ '}
              {q.text}
            </div>
            <div className="lp-choices">
              {q.options.map((o, k) => {
                let cls = 'fb-opt text';
                if (answered) {
                  if (k === q.answer) cls += ' correct';
                  else if (k === given) cls += ' wrong';
                }
                return (
                  <button key={k} type="button" data-fill="" className={cls} onClick={() => !answered && onAnswer(i, k)}>
                    <span className="lp-letter">{LETTERS[k]}.</span> {o.text}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={'quiz-reveal ' + (given === q.answer ? 'ok' : 'bad')}>
                <div>
                  {given === q.answer ? '✅ Đúng' : '❌ Sai'} — đáp án: {LETTERS[q.answer]}
                </div>
                <div className="lp-trans">
                  <div className="hz">{q.text}</div>
                  <div className="py">{q.pinyin}</div>
                  <div className="quiz-reveal-sub">{q.vi}</div>
                  <div className="lp-options">
                    {q.options.map((o, k) => (
                      <div key={k} className={'lp-option' + (k === q.answer ? ' right' : '')}>
                        <b>{LETTERS[k]}.</b> {o.text} {k === q.answer && '✔'}
                        <span className="py"> {o.pinyin}</span>
                        <span className="quiz-reveal-sub"> — {o.vi}</span>
                      </div>
                    ))}
                  </div>
                  <div className="quiz-reveal-sub">💡 {q.explain}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
