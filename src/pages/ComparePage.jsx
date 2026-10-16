import { useEffect, useMemo, useRef, useState } from 'react';
import ComparePair from '../components/ComparePair.jsx';
import LetterTabs from '../components/LetterTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  COMPARE_FILTERS,
  LETTERS,
  PAIR_BY_ID,
  compareKey,
  countPairs,
  filterPairs,
  loadCompareFilter,
  loadCompareLetter,
  pairIdFromHash,
  pairsOfLetter,
  reviewPairs,
  saveCompareFilter,
  saveCompareLetter,
  searchPairs,
} from '../compare.js';
import { Link } from '../router.jsx';

// The confusable-word groups of the chosen letter, filtered by mark, or the search results over every
// group. A /compare#<id> link (from a practice run) switches to that group's letter, shows and opens
// it even if the filter hides it, and scrolls to it.
export default function ComparePage() {
  const { marks, speech, viewVersion } = useApp();
  const { getMark, toggleMark, markRef } = marks;
  const [initial] = useState(() => pairIdFromHash(window.location.hash));
  const [filter, setFilter] = useState(loadCompareFilter);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(initial);
  const [letter, setLetter] = useState(() => (initial ? PAIR_BY_ID[initial].letter : loadCompareLetter()));
  const [open, setOpen] = useState(() => new Set(initial ? [initial] : []));
  const scrolled = useRef(false);

  useEffect(() => {
    if (letter) saveCompareLetter(letter);
  }, [letter]);
  // navigate() has already scrolled to the top, so scroll once the target card is rendered.
  useEffect(() => {
    if (!target || scrolled.current) return;
    scrolled.current = true;
    document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, [target]);

  const all = useMemo(() => pairsOfLetter(letter), [letter]);
  // Rebuilt when the letter, filter or account data changes, not on every mark, so a card does not
  // vanish right after you mark it.
  const { points: pairs, fellBack } = useMemo(() => {
    const m = markRef.current;
    const res = filterPairs(all, filter, (k) => (m[k] && m[k].s) || '');
    if (target && !res.points.some((p) => p.id === target) && all.some((p) => p.id === target)) {
      return { points: all.filter((p) => p.id === target || res.points.includes(p)), fellBack: res.fellBack };
    }
    return res;
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, target, viewVersion]);

  const searching = query.trim() !== '';
  const results = useMemo(() => (searching ? searchPairs(query) : []), [searching, query]);

  const counts = countPairs(all, getMark);
  const n = { all: counts.n, new: counts.fresh, r: counts.r, k: counts.k };
  const reviewCount = reviewPairs(getMark).length;

  const pickFilter = (f) => {
    setFilter(f);
    saveCompareFilter(f);
    setTarget(null);
  };
  const pickLetter = (l) => {
    setTarget(null);
    setQuery('');
    setLetter(l);
  };
  const toggleOpen = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const card = (p, showLetter) => (
    <ComparePair
      key={p.id}
      pair={p}
      mark={getMark(compareKey(p.id))}
      open={open.has(p.id)}
      onToggleOpen={() => toggleOpen(p.id)}
      onMark={(s) => toggleMark(compareKey(p.id), s)}
      speech={speech}
      showLetter={showLetter}
    />
  );

  return (
    <div className="panel">
      {LETTERS.length > 0 && <LetterTabs letter={letter} getMark={getMark} onSelect={pickLetter} />}
      <div className="cp-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm từ trên cả 125 nhóm: 刚才, gangcai…"
          aria-label="Tìm nhóm từ"
        />
      </div>
      {searching ? (
        <>
          <div className="filter-note">
            {results.length ? `${results.length} nhóm khớp “${query.trim()}” trên mọi chữ cái` : 'Không tìm thấy nhóm nào.'}
          </div>
          <div className="grammar-list">{results.map((p) => card(p, true))}</div>
        </>
      ) : (
        <>
          {all.length > 0 && <div className="lesson-title">Chữ {letter}</div>}
          {all.length > 0 && (
            <div className="filter-bar">
              <div className="filter-chips" role="group" aria-label="Lọc nhóm từ theo trạng thái">
                {COMPARE_FILTERS.map(([f, label]) => (
                  <button key={f} type="button" className={'chip' + (f === filter ? ' active' : '')} onClick={() => pickFilter(f)}>
                    {label}
                    <span className="n">{n[f]}</span>
                  </button>
                ))}
              </div>
              {fellBack && <div className="audio-note filter-note">Chưa có nhóm nào ở mục này nên đang hiện cả chữ.</div>}
              <div className="filter-tools">
                <span>
                  Đã nắm {counts.k}/{counts.n} nhóm từ của chữ {letter}
                </span>
              </div>
            </div>
          )}
          <div className="grammar-actions">
            {all.length > 0 && (
              <Link to="/compare/practice" className="btn">
                📝 Luyện tập chữ này
              </Link>
            )}
            {reviewCount > 0 && (
              <Link to="/compare/review" className="btn secondary">
                🔁 Ôn các nhóm cần ôn ({reviewCount})
              </Link>
            )}
          </div>
          {all.length === 0 ? (
            <div className="grammar-empty">Nội dung đang được soạn.</div>
          ) : (
            <div className="grammar-list">{pairs.map((p) => card(p, false))}</div>
          )}
        </>
      )}
    </div>
  );
}
