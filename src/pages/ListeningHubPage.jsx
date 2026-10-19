import { useApp } from '../context/AppContext.jsx';
import { listenKey, partById, questionsOf, reviewQuestions, typeCount } from '../listening.js';
import { Link } from '../router.jsx';

// Pick what to do in a part of the listening section: tips, one question type, a mixed run or a
// review of the questions marked "needs review".
export default function ListeningHubPage({ part: partId }) {
  const { marks } = useApp();
  const part = partById(partId);
  const base = '/listening/' + part.id;
  const counts = typeCount(part);
  const total = part.questions.length;
  const reviewN = reviewQuestions(marks.getMark, part).length;
  const toReview = (typeId) => questionsOf(part, typeId).filter((q) => marks.getMark(listenKey(q.id)) === 'r').length;

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
          Part {part.id.slice(1)} · {part.label} · {part.desc} · {total} câu · {reviewN} câu cần ôn
        </span>
      </div>
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {card('tips', base + '/tips', '📘 Mẹo làm bài', 'Cách làm part này, các bẫy hay gặp và ví dụ nghe được.', 'Đọc 5 phút')}
        {part.types.map((t) =>
          card(
            t.id,
            base + '/practice/' + t.id,
            `${t.icon} ${t.name}`,
            t.desc,
            counts[t.id] ? `${counts[t.id]} câu · ${toReview(t.id)} cần ôn` : 'Sắp có',
            counts[t.id] > 0
          )
        )}
        {card('mix', base + '/practice/mix', '🎯 Luyện tổng hợp', 'Mười câu trộn các dạng, như phần này của đề thật.', 'Lượt mới mỗi lần', total > 0)}
        {card('review', base + '/review', '🔁 Ôn câu sai', 'Các câu đang “cần ôn” của part này (tối đa 30 câu).', reviewN ? `${reviewN} câu cần ôn` : 'Chưa có câu nào cần ôn 🎉', reviewN > 0)}
      </div>
    </div>
  );
}
