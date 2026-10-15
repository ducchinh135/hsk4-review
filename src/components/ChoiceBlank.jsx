// Fill the blank with one of the options; after answering, the right option is green and a wrong pick red.
export default function ChoiceBlank({ q, answered, onAnswer }) {
  const [before, after] = q.q.split('___');
  return (
    <>
      <div className="fb-sentence">
        {before}
        <span className="fb-blank">{answered ? q.answer : '＿＿＿'}</span>
        {after}
      </div>
      <div className="fb-options">
        {q.options.map((opt) => {
          let cls = 'fb-opt';
          if (answered) {
            if (opt === q.answer) cls += ' correct';
            else if (opt === answered.given) cls += ' wrong';
          }
          return (
            <button key={opt} type="button" className={cls} onClick={() => !answered && onAnswer(opt)}>
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}
