// A ★ statement to judge true or false. After answering, the right button is green and a wrong pick red.
export default function TrueFalseQuestion({ q, answered, onAnswer }) {
  const btn = (value, label) => {
    let cls = 'fb-opt';
    if (answered) {
      if (value === q.answer) cls += ' correct';
      else if (value === answered.given) cls += ' wrong';
    }
    return (
      <button type="button" className={cls} onClick={() => !answered && onAnswer(value)}>
        {label}
      </button>
    );
  };
  return (
    <>
      <div className="lp-star">★ {q.statement}</div>
      <div className="lp-tf">
        {btn(true, '✔ 对 · Đúng')}
        {btn(false, '✘ 错 · Sai')}
      </div>
    </>
  );
}
