import { useApp } from '../context/AppContext.jsx';
import { REVIEW_MAX, partById, readKey, reviewUnits, typeCount, unitsOf } from '../reading.js';
import { Link } from '../router.jsx';

// Pick what to do in a part of the reading section: tips, one type, a mixed run or a review of the
// sets marked "needs review".
export default function ReadingHubPage({ part: partId }) {
  const { marks } = useApp();
  const part = partById(partId);
  const base = '/reading/' + part.id;
  const counts = typeCount(part);
  const total = unitsOf(part).length;
  const reviewN = reviewUnits(marks.getMark, part).length;
  const toReview = (typeId) => unitsOf(part, typeId).filter((u) => marks.getMark(readKey(u.id)) === 'r').length;

  const card = (key, to, name, desc, count, on = true) => {
    const body = (
      <>
        <div className="exercise-name">{name}</div>
        <div className="exercise-desc">{desc}</div>
        <div className="exercise-count">{count}</div>
      </>
    );
    return on ? (
      <Link key={key} to={to} className="exercise-card">
        {body}
      </Link>
    ) : (
      <div key={key} className="exercise-card off" aria-disabled="true">
        {body}
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="exercise-top">
        <span className="exercise-summary">
          Part {part.id.slice(1)} · {part.label} · {part.desc} · {total} bộ · {reviewN} bộ cần ôn
        </span>
      </div>
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {card('tips', base + '/tips', '📘 Mẹo làm bài', 'Cách làm part này, các bẫy hay gặp và ví dụ.', 'Đọc 5 phút')}
        {part.types.map((t) =>
          card(t.id, base + '/practice/' + t.id, `${t.icon} ${t.name}`, t.desc, counts[t.id] ? `${counts[t.id]} bộ · ${toReview(t.id)} cần ôn` : 'Sắp có', counts[t.id] > 0)
        )}
        {card('mix', base + '/practice/mix', '🎯 Luyện tổng hợp', 'Hai bộ (một câu đơn, một hội thoại), như phần này của đề thật.', 'Lượt mới mỗi lần', total > 0)}
        {card(
          'review',
          base + '/review',
          '🔁 Ôn câu sai',
          `Các bộ đang “cần ôn” của part này (tối đa ${REVIEW_MAX[part.id]} bộ).`,
          reviewN ? `${reviewN} bộ cần ôn` : 'Chưa có bộ nào cần ôn 🎉',
          reviewN > 0
        )}
      </div>
    </div>
  );
}
