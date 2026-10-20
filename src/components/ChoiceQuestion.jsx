import { useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

// Four printed answers to pick from. The question itself is only heard (as in the exam); the
// "Xem câu hỏi" link shows it as text for a learner who missed it. After answering, the right
// answer is green and a wrong pick red. Remount (via `key`) per question.
export default function ChoiceQuestion({ q, answered, onAnswer }) {
  const [peek, setPeek] = useState(false);
  return (
    <>
      {!answered && (
        <div className="lp-peek">
          {peek ? (
            <span className="lp-peek-text">❓ {q.question.text}</span>
          ) : (
            <button type="button" className="link-btn small" onClick={() => setPeek(true)}>
              👁 Xem câu hỏi
            </button>
          )}
        </div>
      )}
      <div className="lp-choices">
        {q.options.map((o, i) => {
          let cls = 'fb-opt text';
          if (answered) {
            if (i === q.answer) cls += ' correct';
            else if (i === answered.given) cls += ' wrong';
          }
          return (
            <button key={i} type="button" className={cls} onClick={() => !answered && onAnswer(i)}>
              <span className="lp-letter">{LETTERS[i]}.</span> {o.text}
            </button>
          );
        })}
      </div>
    </>
  );
}
