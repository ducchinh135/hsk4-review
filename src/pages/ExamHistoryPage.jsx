import { useState } from 'react';
import { TOTALS, deleteAttempt, loadAttempts, scaled, testByNo, testName } from '../exam.js';
import { Link } from '../router.jsx';

const fmt = (at) => (at ? new Date(at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Không rõ ngày');
const SECTIONS = [
  ['listening', '🎧 Nghe'],
  ['reading', '📄 Đọc'],
  ['writing', '✍️ Viết'],
];

// Listening + reading points of an attempt (out of 85), or the stored best total of an old record.
const totalOf = (a) => (a.bestTotal !== undefined ? a.bestTotal : a.scores ? a.scores.listening.score + a.scores.reading.score : 0);

// Listening + reading total of each real-exam attempt in time order, as a row of bars.
function Trend({ attempts }) {
  const pts = attempts.filter((a) => a.mode === 'real' && a.at && a.scores).sort((a, b) => a.at - b.at).slice(-20);
  if (pts.length < 2) return null;
  return (
    <div className="exam-trend" role="img" aria-label="Điểm Nghe + Đọc các lần thi thật gần đây">
      <div className="quiz-label">Điểm Nghe + Đọc các lần thi thật (trên 85 câu)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
        {pts.map((a) => (
          <div key={a.id} title={`${testName(testByNo(a.test))} · ${fmt(a.at)} · ${totalOf(a)}/85`} style={{ flex: 1, maxWidth: 28, textAlign: 'center', fontSize: 10 }}>
            <div style={{ height: (totalOf(a) / 85) * 70, background: 'var(--accent, #4a7bd0)', borderRadius: 3, minHeight: 2 }} />
            {totalOf(a)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Every practice and real-exam attempt, newest first: its scores, a link to look it over again, and delete.
export default function ExamHistoryPage() {
  const [attempts, setAttempts] = useState(loadAttempts);
  const [filter, setFilter] = useState('all'); // 'all' | 'real' | 'study'
  const shown = attempts.filter((a) => filter === 'all' || a.mode === filter).sort((a, b) => (b.at || 0) - (a.at || 0));

  const remove = (a) => {
    if (!window.confirm('Xoá lần làm này khỏi lịch sử?')) return;
    deleteAttempt(a.id);
    setAttempts(loadAttempts());
  };

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to="/exam" className="link-btn">
          ← Các đề
        </Link>
        <span className="exercise-summary">Lịch sử làm bài · {attempts.length} lần</span>
      </div>
      <div className="exam-tabs">
        {[['all', 'Tất cả'], ['real', '⏱ Thi thật'], ['study', '📖 Ôn tập']].map(([k, label]) => (
          <button key={k} type="button" className={'btn' + (filter === k ? '' : ' secondary')} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <Trend attempts={attempts} />
      {!shown.length && <div className="rd-note">Chưa có lần làm nào. Làm một đề ở mục “Luyện đề” và bài sẽ được lưu ở đây.</div>}
      <div className="panel practice-hub" style={{ padding: 0 }}>
        {shown.map((a) => {
          const t = testByNo(a.test);
          if (!t) return null;
          const best = a.bestTotal !== undefined;
          return (
            <div key={a.id} className="exercise-card">
              <div className="exercise-name">
                📝 {testName(t)} · {a.mode === 'real' ? '⏱ Thi thật' : '📖 Ôn tập'}
              </div>
              <div className="exercise-count">
                {fmt(a.at)}
                {a.legacy && ' · ghi từ phiên bản cũ'}
              </div>
              <div className="exercise-count">
                {best
                  ? `Điểm Nghe + Đọc cao nhất trước đây: ${a.bestTotal}/85 (không còn chi tiết)`
                  : SECTIONS.filter(([s]) => a.scores[s]).map(([s, label]) => `${label} ${a.scores[s].score}/${TOTALS[s]}${s === 'writing' ? '' : ` (${scaled(a.scores[s].score, TOTALS[s])})`}`).join(' · ')}
              </div>
              <div className="controls exam-modes">
                {!a.legacy && (
                  <Link to={`/exam/review/${a.id}`} className="btn">
                    🔍 Xem lại
                  </Link>
                )}
                <button type="button" className="btn secondary" onClick={() => remove(a)}>
                  🗑 Xoá
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
