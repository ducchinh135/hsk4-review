import { shuffle } from '../lessons.js';
import FlipCard from './FlipCard.jsx';

export default function ReviewPanel({ words, state, setState, getMark, toggleMark, speech }) {
  const { order, index } = state;
  const w = words[order[index]];
  const show = (next) => {
    setState(next);
    speech.autoSpeak(words[next.order[next.index]][0]);
  };

  return (
    <div className="panel">
      <div className="viewer">
        <div className="progress">
          Từ {index + 1} / {words.length} (thứ tự đã xáo trộn)
        </div>
        <FlipCard
          key={index + ':' + order[index]}
          id="review-"
          word={w}
          hint="Đọc to lên rồi chạm để kiểm tra!"
          mark={getMark(w[0])}
          onMark={(s) => toggleMark(w[0], s)}
          speech={speech}
        />
        <div className="controls">
          <button className="btn secondary" onClick={() => show({ order: shuffle(order), index: 0 })}>
            🔀 Xáo trộn lại
          </button>
          <button
            className="btn"
            onClick={() => {
              const i = (index + 1) % order.length;
              show({ order: i === 0 ? shuffle(order) : order, index: i });
            }}
          >
            Từ tiếp theo ▶
          </button>
        </div>
      </div>
    </div>
  );
}
