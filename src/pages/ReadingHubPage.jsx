import { useApp } from '../context/AppContext.jsx';
import { REVIEW_MAX, mixSize, partById, reviewCount, reviewUnits, typeCount, unitNoun, unitsOf } from '../reading.js';
import { Link } from '../router.jsx';

// Pick what to do in a part of the reading section: tips, one type, a mixed run or a review of the
// units marked "needs review".
export default function ReadingHubPage({ part: partId }) {
  const { marks } = useApp();
  const part = partById(partId);
  const base = '/reading/' + part.id;
  const counts = typeCount(part);
  const noun = unitNoun(part);
  const total = unitsOf(part).length;
  const reviewN = reviewCount(marks.getMark, part);
  // what is counted as "needs review": a set, a question, or a passage's question
  const reviewNoun = part.format === 'read' ? 'câu hỏi' : noun;
  const toReview = (typeId) =>
    reviewUnits(marks.getMark, part)
      .filter((u) => u.type === typeId)
      .reduce((t, u) => t + (part.format === 'read' ? u.questions.length : 1), 0);
  const mixDesc = {
    fill: 'Hai bộ (một câu đơn, một hội thoại), như phần này của đề thật.',
    order: `${mixSize(part)} câu trộn các dạng, như phần này của đề thật.`,
    read: 'Mười bốn đoạn ngắn và ba đoạn dài (20 câu hỏi), như phần này của đề thật.',
  }[part.format];

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
          Part {part.id.slice(1)} · {part.label} · {part.desc} · {total} {noun} · {reviewN} {reviewNoun} cần ôn
        </span>
      </div>
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {card('tips', base + '/tips', '📘 Mẹo làm bài', 'Cách làm part này, các bẫy hay gặp và ví dụ.', 'Đọc 5 phút')}
        {part.types.map((t) =>
          card(t.id, base + '/practice/' + t.id, `${t.icon} ${t.name}`, t.desc, counts[t.id] ? `${counts[t.id]} ${noun} · ${toReview(t.id)} ${part.format === 'read' ? 'câu hỏi ' : ''}cần ôn` : 'Sắp có', counts[t.id] > 0)
        )}
        {card('mix', base + '/practice/mix', '🎯 Luyện tổng hợp', mixDesc, 'Lượt mới mỗi lần', total > 0)}
        {card(
          'review',
          base + '/review',
          '🔁 Ôn câu sai',
          `Các ${noun} đang “cần ôn” của part này (tối đa ${REVIEW_MAX[part.id]} ${noun}).`,
          reviewN ? `${reviewN} ${reviewNoun} cần ôn` : `Chưa có ${reviewNoun} nào cần ôn 🎉`,
          reviewN > 0
        )}
      </div>
    </div>
  );
}
