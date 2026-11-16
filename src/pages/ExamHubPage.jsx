import { TESTS, TOTALS, loadResults, scaled } from '../exam.js';
import { Link } from '../router.jsx';

// The list of mock tests: for each, a practice mode (graded as you go, audio replayable) and a real-exam
// mode (audio plays once at the exam's pace), with the last and best real-exam score.
export default function ExamHubPage() {
  const results = loadResults();
  return (
    <div className="panel">
      <div className="exercise-top">
        <span className="exercise-summary">
          Luyện đề · {TESTS.length} đề mô phỏng HSK 4 · Nghe {TOTALS.listening} câu + Đọc {TOTALS.reading} câu
        </span>
      </div>
      <div className="rd-note">
        <b>📖 Ôn tập:</b> làm từng câu, có đáp án và giải thích ngay, nghe lại audio thoải mái. <b>⏱ Thi thật:</b> nghe một lần theo nhịp đề thi, rồi làm phần Đọc trong 40 phút, chấm điểm ở cuối.
      </div>
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {TESTS.map((t) => {
          const r = results[t.test];
          return (
            <div key={t.test} className="exercise-card">
              <div className="exercise-name">📝 Đề số {t.test}</div>
              <div className="exercise-count">
                {r
                  ? `Thi thật lần cuối: Nghe ${r.last.listening}/${TOTALS.listening} (${scaled(r.last.listening, TOTALS.listening)}) · Đọc ${r.last.reading}/${TOTALS.reading} (${scaled(r.last.reading, TOTALS.reading)}) · Cao nhất ${r.best}/85`
                  : 'Chưa thi thật'}
              </div>
              <div className="controls exam-modes">
                <Link to={`/exam/${t.test}/study`} className="btn secondary">
                  📖 Ôn tập
                </Link>
                <Link to={`/exam/${t.test}/real`} className="btn">
                  ⏱ Thi thật
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rd-note">Phần Viết của các đề chưa có.</div>
    </div>
  );
}
