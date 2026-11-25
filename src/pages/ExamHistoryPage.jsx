import { useEffect, useState } from 'react';
import { TOTALS, deleteAttempt, loadAttempts, scaled, subscribeAttempts, testByNo, testName } from '../exam.js';
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
    <div className="exam-trend" role="img" aria-label="Điểm Nghe + Đọc các lần thi thật gần đây" style={{ margin: '8px 0 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Điểm Nghe + Đọc các lần thi thật (tối đa 85)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, padding: '0 4px', borderBottom: '2px solid rgba(128,128,128,.35)', overflowX: 'auto' }}>
        {pts.map((a) => (
          <div key={a.id} title={`${testName(testByNo(a.test))} · ${fmt(a.at)} · ${totalOf(a)}/85`} style={{ flex: '0 0 34px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
            {totalOf(a)}
            <div style={{ height: Math.max(4, (totalOf(a) / 85) * 64), background: 'var(--accent, #ee6a7c)', borderRadius: '4px 4px 0 0', marginTop: 2 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '2px 4px', fontSize: 11, opacity: 0.7, overflowX: 'auto' }}>
        {pts.map((a) => (
          <div key={a.id} style={{ flex: '0 0 34px', textAlign: 'center' }}>
            {a.test > 10 ? 'H' + a.test : 'Đề ' + a.test}
          </div>
        ))}
      </div>
    </div>
  );
}

// Every practice and real-exam attempt, newest first: its scores, a link to look it over again, and delete.
export default function ExamHistoryPage() {
  const [attempts, setAttempts] = useState(loadAttempts);
  // attempts that arrive from the account sync show up without a reload
  useEffect(() => subscribeAttempts(() => setAttempts(loadAttempts())), []);
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
