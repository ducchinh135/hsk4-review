import { useState } from 'react';

// Put the shuffled parts in order: tap a part below to append it to the answer line, tap one on the
// answer line to send it back. Remount (via `key`) per question.
export default function OrderQuestion({ q, answered, onAnswer }) {
  const [picked, setPicked] = useState([]); // positions in q.tiles, in answer order
  if (answered) return <div className={'order-line done ' + (answered.ok ? 'ok' : 'bad')}>{answered.given}</div>;

  const pool = q.tiles.map((t, k) => ({ ...t, k })).filter((t) => !picked.includes(t.k));
  const full = picked.length === q.tiles.length;
  return (
    <>
      <div className="order-line" aria-label="Câu trả lời">
        {picked.length ? (
          picked.map((k) => (
            <button key={k} type="button" className="order-tile" onClick={() => setPicked((p) => p.filter((x) => x !== k))}>
              {q.tiles[k].text}
            </button>
          ))
        ) : (
          <span className="order-hint">Bấm các cụm bên dưới theo đúng thứ tự</span>
        )}
      </div>
      <div className="order-pool">
        {pool.map((t) => (
          <button key={t.k} type="button" className="order-tile" onClick={() => setPicked((p) => [...p, t.k])}>
            {t.text}
          </button>
        ))}
      </div>
      <div className="controls">
        <button type="button" className="btn" disabled={!full} onClick={() => onAnswer(picked.map((k) => q.tiles[k].text).join(''))}>
          Kiểm tra
        </button>
      </div>
    </>
  );
}
