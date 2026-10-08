import { useEffect, useRef, useState } from 'react';

const CHIPS = [
  ['all', 'Tất cả'],
  ['new', 'Chưa đánh dấu'],
  ['r', '🔁 Cần ôn lại'],
  ['k', '✅ Đã thuộc'],
];

export const FILTER_LABELS = Object.fromEntries(CHIPS);

export default function FilterBar({ counts, filter, fellBack, onFilter, onReset }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const reset = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onReset();
  };

  const n = { all: counts.n, new: counts.fresh, r: counts.r, k: counts.k };
  return (
    <div className="filter-bar">
      <div className="filter-chips" role="group" aria-label="Lọc từ theo trạng thái">
        {CHIPS.map(([f, label]) => (
          <button key={f} className={'chip' + (f === filter ? ' active' : '')} onClick={() => onFilter(f)}>
            {label}
            <span className="n">{n[f]}</span>
          </button>
        ))}
      </div>
      {fellBack && <div className="audio-note filter-note">Chưa có từ nào ở mục này nên đang hiện tất cả từ của bài.</div>}
      <div className="filter-tools">
        <span>
          Đã thuộc {counts.k}/{counts.n} từ của bài này
        </span>
        <button className="link-btn" type="button" onClick={reset}>
          {armed ? 'Bấm lần nữa để xác nhận xóa' : 'Xóa đánh dấu bài này'}
        </button>
      </div>
    </div>
  );
}
