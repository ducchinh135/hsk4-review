import { useEffect } from 'react';

// Multiple choice: meaning, hanzi, listen and fill questions. Remount (via `key`) per question.
export default function ChoiceQuestion({ q, answered, onAnswer, speech }) {
  const w = q.word;
  useEffect(() => {
    if (q.type === 'listen') speech.speak(w[0], 'quiz-listen');
    // play once when the question appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <Prompt q={q} speech={speech} />
      <div className="fb-options">
        {q.options.map((opt) => {
          let cls = 'fb-opt' + (q.type === 'meaning' ? ' text' : '');
          if (answered) {
            if (opt === q.answer) cls += ' correct';
            else if (opt === answered.given) cls += ' wrong';
          }
          return (
            <button key={opt} className={cls} onClick={() => !answered && onAnswer(opt, opt === q.answer)}>
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Prompt({ q, speech }) {
  const w = q.word;
  if (q.type === 'meaning') return <div className="quiz-prompt hanzi">{w[0]}</div>;
  if (q.type === 'hanzi') return <div className="quiz-prompt">{w[2]}</div>;
  if (q.type === 'listen') {
    return (
      <div className="quiz-prompt">
        <button className={'btn' + (speech.speakingId === 'quiz-listen' ? ' speaking' : '')} onClick={() => speech.speak(w[0], 'quiz-listen')}>
          🔊 Nghe lại
        </button>
      </div>
    );
  }
  const at = w[3].indexOf(w[0]);
  return (
    <>
      <div className="fb-hint">💡 Gợi ý nghĩa của từ: {w[2]}</div>
      <div className="fb-sentence">
        {w[3].slice(0, at)}
        <span className="fb-blank">＿＿＿</span>
        {w[3].slice(at + w[0].length)}
      </div>
    </>
  );
}
