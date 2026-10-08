import { useRef } from 'react';
import { LESSON_COLORS } from '../lessons.js';
import FlipCard from './FlipCard.jsx';

export default function CardsPanel({ lesson, words, index, setIndex, getMark, toggleMark, speech }) {
  const n = words.length;
  const w = words[index];
  const c = LESSON_COLORS[lesson];
  const go = (i) => {
    setIndex(i);
    speech.autoSpeak(words[i][0]);
  };
  const card = useRef(null);

  return (
    <div className="panel">
      <div className="viewer">
        <div className="progress">
          Từ {index + 1} / {n}
        </div>
        <FlipCard
          key={index}
          flipRef={card}
          id="cards-"
          word={w}
          hint="👆 Chạm vào thẻ để xem phiên âm & nghĩa"
          mark={getMark(w[0])}
          onMark={(s) => toggleMark(w[0], s)}
          speech={speech}
        />
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ Trước
          </button>
          <button className="btn" id="cardFlip" onClick={() => card.current?.toggle()}>
            🔄 Lật thẻ
          </button>
          <button className="btn secondary" onClick={() => go((index + 1) % n)}>
            Tiếp ▶
          </button>
        </div>
        <div className="grid-overview">
          {words.map((x, i) => {
            const m = getMark(x[0]);
            const cls = 'mini-card' + (i === index ? ' current' : '') + (m === 'k' ? ' is-known' : m === 'r' ? ' is-review' : '');
            return (
              <div key={x[0]} className={cls} style={{ background: i % 2 === 0 ? c.a : c.b }} onClick={() => go(i)}>
                {x[0]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
