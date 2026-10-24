import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { COUNTS, FILTERS, GAMES, ORDERS, loadSettings, poolFor, saveSettings } from '../games.js';
import { LESSON_LABELS, LESSON_ORDER } from '../lessons.js';
import { Link } from '../router.jsx';

function ModePicker({ game, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modeTitle" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mode-head">
          <h2 id="modeTitle">Chọn chế độ {game.name}</h2>
          <button type="button" className="mode-close" aria-label="Đóng" onClick={onClose}>✕</button>
        </div>
        <div className="mode-grid">
          {game.modes.map((m) => (
            <Link key={m.id} to={m.path} className="mode-card">
              <div className="exercise-name">{m.name}</div>
              <div className="exercise-desc">{m.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Word settings shared by every game, then one card per game.
export default function GamesHubPage() {
  const { marks } = useApp();
  const [settings, setSettings] = useState(loadSettings);
  const [picking, setPicking] = useState(null);
  const set = (key, value) => {
    const next = { ...settings, [key]: value };
    saveSettings(next);
    setSettings(next);
  };
  const n = poolFor(settings, marks.getMark).length;
  const play = settings.count === 'all' ? n : Math.min(settings.count, n);

  const select = (key, label, options) => (
    <label className="game-select">
      <span>{label}</span>
      <select value={String(settings[key])} onChange={(e) => set(key, key === 'count' && e.target.value !== 'all' ? Number(e.target.value) : e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>{text}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="panel">
      <div className="game-settings">
        {select('lesson', 'Bài', [['all', 'Tất cả các bài'], ...LESSON_ORDER.map((l) => [l, LESSON_LABELS[l]])])}
        {select('filter', 'Bộ lọc', FILTERS)}
        {select('order', 'Thứ tự', ORDERS)}
        {select('count', 'Số lượng', COUNTS.map((c) => [c, c === 'all' ? 'Tất cả' : c + ' từ']))}
      </div>
      <div className="game-count">{n} từ phù hợp</div>
      <div className="practice-hub">
        {GAMES.map((g) => {
          const body = (
            <>
              <div className="exercise-name">{g.icon} {g.name}</div>
              <div className="exercise-desc">{g.desc}</div>
              <div className="exercise-count">{n ? `${play} từ` : 'Không có từ phù hợp'}</div>
            </>
          );
          if (!n) return <div key={g.id} className="exercise-card off" aria-disabled="true">{body}</div>;
          return g.path ? (
            <Link key={g.id} to={g.path} className="exercise-card">{body}</Link>
          ) : (
            <button key={g.id} type="button" className="exercise-card" onClick={() => setPicking(g)}>{body}</button>
          );
        })}
      </div>
      <p className="game-tip">Nhớ không ra trong vài giây thì bấm “Không nhớ” xem đáp án — xem rồi được hỏi lại sớm giúp nhớ nhanh hơn cố nghĩ lâu.</p>
      {picking && <ModePicker game={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}
