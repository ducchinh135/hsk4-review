import { useEffect, useRef, useState } from 'react';
import { ALL_HANZI, WORD_BY_HANZI } from '../lessons.js';
import { buildQueue, newCard, preview, today } from '../srs.js';
import { Link } from '../router.jsx';
import FlipCard from './FlipCard.jsx';

const GRADES = [
  [1, 'Quên'],
  [2, 'Khó'],
  [3, 'Được'],
  [4, 'Dễ'],
];

// Daily spaced-repetition review across all lessons. The page mounts it only while /daily is
// shown, so an unfinished session is dropped when you leave (every graded card is already saved).
export default function SrsPanel({ srs, counts, speech }) {
  // null = start screen; otherwise { queue: hanzi[], reviewed, again, undo: { h, prev, session } | null }
  const [session, setSession] = useState(null);
  const card = useRef(null);

  const start = () => {
    const queue = buildQueue(srs.getAll(), ALL_HANZI, today());
    setSession({ queue, reviewed: 0, again: 0, undo: null });
    if (queue.length) speech.autoSpeak(queue[0]);
  };

  const grade = (g) => {
    const h = session.queue[0];
    const prev = srs.getAll()[h] || newCard(today());
    const requeue = srs.review(h, g);
    const rest = session.queue.slice(1);
    if (requeue) rest.splice(Math.min(requeue, rest.length), 0, h);
    setSession({ queue: rest, reviewed: session.reviewed + 1, again: session.again + (g === 1 ? 1 : 0), undo: { h, prev, session } });
    if (rest.length) speech.autoSpeak(rest[0]);
  };

  const undo = () => {
    const { h, prev, session: before } = session.undo;
    srs.restore(h, prev);
    setSession({ ...before, undo: null });
  };

  // Space flips, 1-4 grade (only once flipped). Ignored while typing or while any modal is open.
  const keys = useRef(null);
  keys.current = { grade, live: !!session && session.queue.length > 0 };
  useEffect(() => {
    const onKey = (e) => {
      const k = keys.current;
      if (!k.live || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select') || document.querySelector('.modal')) return;
      if (e.key === ' ') {
        e.preventDefault();
        card.current?.toggle();
      } else if (/^[1-4]$/.test(e.key) && card.current?.isFlipped()) {
        k.grade(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cls = 'panel';

  if (!session) {
    const any = counts.due + counts.learning > 0;
    return (
      <div className={cls}>
        <div className="fillblank-box srs-box">
          <div className="srs-stats">
            <div className="srs-stat">
              <b>{counts.due}</b>Đến hạn
            </div>
            <div className="srs-stat">
              <b>{counts.learning}</b>Đang học
            </div>
            <div className="srs-stat">
              <b>{counts.enrolled}</b>Trong lịch ôn
            </div>
          </div>
          {any ? (
            <button className="btn" onClick={start}>
              ▶ Bắt đầu
            </button>
          ) : counts.enrolled ? (
            <div className="srs-note">Hôm nay không còn thẻ nào. Quay lại vào ngày mai nhé!</div>
          ) : (
            <div className="srs-note">
              Chưa có từ nào trong lịch ôn. Vào <Link to="/words">Danh sách từ vựng</Link> để đưa cả bài vào lịch, hoặc đánh dấu từng từ.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session.queue.length) {
    return (
      <div className={cls}>
        <div className="fillblank-box srs-box">
          <h2>🎉 Xong hôm nay!</h2>
          <p>
            Đã ôn {session.reviewed} lượt · Quên {session.again} lần
          </p>
          <p>
            Ngày mai có khoảng <b>{counts.tomorrow}</b> thẻ.
          </p>
          <div className="controls">
            {session.undo && (
              <button className="btn secondary" onClick={undo}>
                ↶ Hoàn tác
              </button>
            )}
            <button className="btn" onClick={() => setSession(null)}>
              Về màn hình bắt đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const h = session.queue[0];
  const labels = preview(srs.getAll()[h], today());
  return (
    <div className={cls}>
      <div className="viewer">
        <div className="progress">Còn {session.queue.length} thẻ</div>
        <FlipCard
          key={session.reviewed + ':' + h}
          flipRef={card}
          id="srs-"
          word={WORD_BY_HANZI[h]}
          hint="Nhớ nghĩa rồi chạm để kiểm tra"
          mark=""
          speech={speech}
          actions={
            <div className="grade-row">
              {GRADES.map(([g, label], i) => (
                <button
                  key={g}
                  type="button"
                  className="grade-btn"
                  data-g={g}
                  onClick={(e) => {
                    e.stopPropagation();
                    grade(g);
                  }}
                >
                  {label}
                  <span>{labels[i]}</span>
                </button>
              ))}
            </div>
          }
        />
        <div className="controls">
          <button className="btn secondary" disabled={!session.undo} onClick={undo}>
            ↶ Hoàn tác
          </button>
          <button className="btn" onClick={() => card.current?.toggle()}>
            🔄 Lật thẻ
          </button>
        </div>
        <div className="srs-keys">Phím tắt: Space lật thẻ · 1–4 chấm</div>
      </div>
    </div>
  );
}
