import { useMemo, useState } from 'react';
import { shuffle } from '../lessons.js';

export default function FillPanel({ words, lessonWords, state, setState, getMark, setMark, speech }) {
  const { order, index, correct, total } = state;
  const w = words[order[index]];
  const [picked, setPicked] = useState(null); // option chosen for this question

  // The right word plus 3 distractors from the same lesson.
  const options = useMemo(() => {
    const others = lessonWords.filter((x) => x[0] !== w[0]).map((x) => x[0]);
    return shuffle([w[0], ...shuffle(others).slice(0, 3)]);
  }, [w, lessonWords]);

  const answer = (opt) => {
    if (picked !== null) return;
    setPicked(opt);
    const ok = opt === w[0];
    setState({ ...state, correct: correct + (ok ? 1 : 0), total: total + 1 });
    if (!ok && getMark(w[0]) !== 'r') setMark(w[0], 'r');
    speech.speak(w[3], 'fill');
  };
  const restart = () => {
    setPicked(null);
    setState({ order: shuffle(order), index: 0, correct: 0, total: 0 });
  };
  const next = () => {
    const i = (index + 1) % order.length;
    setPicked(null);
    setState({ ...state, order: i === 0 ? shuffle(order) : order, index: i });
  };

  const at = w[3].indexOf(w[0]);
  const sentence =
    at < 0 ? (
      w[3]
    ) : (
      <>
        {w[3].slice(0, at)}
        <span className="fb-blank">＿＿＿</span>
        {w[3].slice(at + w[0].length)}
      </>
    );

  return (
    <div className="panel active">
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {words.length}
        </div>
        <div className="fb-hint">💡 Gợi ý nghĩa của từ: {w[2]}</div>
        <div className="fb-sentence">{sentence}</div>
        <div className="fb-options">
          {options.map((opt) => {
            let cls = 'fb-opt';
            if (picked !== null) {
              if (opt === w[0]) cls += ' correct';
              else if (opt === picked) cls += ' wrong';
            }
            return (
              <button key={opt} className={cls} onClick={() => answer(opt)}>
                {opt}
              </button>
            );
          })}
        </div>
        <div className="controls">
          <button className="btn secondary" onClick={restart}>
            🔁 Làm lại từ đầu
          </button>
          {speech.supported && picked !== null && (
            <button className={'btn' + (speech.speakingId === 'fill' ? ' speaking' : '')} onClick={() => speech.speak(w[3], 'fill')}>
              🔊 Nghe câu
            </button>
          )}
          <button className="btn" onClick={next}>
            Câu tiếp theo ▶
          </button>
        </div>
        <div className="fb-score">
          Điểm: {correct} / {total}
        </div>
      </div>
    </div>
  );
}
