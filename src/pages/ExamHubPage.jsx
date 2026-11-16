import { EXAM_MINUTES, TESTS, TOTAL, loadResults, scaled } from '../exam.js';
import { Link } from '../router.jsx';

// The list of full tests: one card per test with the best and last score.
export default function ExamHubPage() {
  const results = loadResults();
  return (
    <div className="panel">
      <div className="exercise-top">
        <span className="exercise-summary">
          Luyện đề · {TESTS.length} đề mô phỏng HSK 4 · phần Đọc (câu 46–85, {TOTAL} câu, {EXAM_MINUTES} phút)
        </span>
      </div>
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {TESTS.map((t) => {
          const r = results[t.test];
          return (
            <Link key={t.test} to={'/exam/' + t.test} className="exercise-card">
              <div className="exercise-name">📝 Đề số {t.test}</div>
              <div className="exercise-desc">Chọn từ điền chỗ trống · Sắp xếp câu · Đọc hiểu</div>
              <div className="exercise-count">
                {r ? `Lần cuối ${r.last}/${TOTAL} · Cao nhất ${r.best}/${TOTAL} (${scaled(r.best)} điểm)` : 'Chưa làm'}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="rd-note">Phần Nghe và Viết của các đề sẽ được thêm sau.</div>
    </div>
  );
}
