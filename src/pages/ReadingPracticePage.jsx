import { useEffect, useState } from 'react';
import FillSet from '../components/FillSet.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  REVIEW_MAX,
  buildMix,
  buildRun,
  clearSlot,
  emptyFill,
  fillKeyAction,
  gradeSet,
  isFull,
  loadShowPinyin,
  partById,
  placeWord,
  readKey,
  reviewUnits,
  saveShowPinyin,
  selectSlot,
  unitsOf,
} from '../reading.js';
import { Link } from '../router.jsx';

// A practice run over one type of a reading part (scope "type"), a mix of its types ("mix") or every
// "needs review" set of the part ("review"). Built once on mount; the shell remounts the page
// (key = viewVersion) when account data changes.
export default function ReadingPracticePage({ part: partId, scope, type }) {
  const { marks } = useApp();
  const { getMark, setMark, toggleMark } = marks;
  const part = partById(partId);
  const hub = '/reading/' + part.id;
  const typeInfo = part.types.find((t) => t.id === type);
  const typeName = (u) => part.types.find((t) => t.id === u.type).name;
  const setLine = (u) => u.words.map((w) => w.text).join('、');

  const build = () =>
    scope === 'review'
      ? buildRun(reviewUnits(getMark, part), { max: REVIEW_MAX[part.id] })
      : scope === 'mix'
      ? buildMix(part)
      : buildRun(unitsOf(part, type));
  const fresh = (units, run) => ({ units, run, index: 0, fills: {}, graded: {}, showDone: false });
  const [state, setState] = useState(() => fresh(build(), 0));
  const [showPinyin, setShowPinyin] = useState(loadShowPinyin);
  const restart = (units) => setState((s) => fresh(units, s.run + 1));
  const go = (i) => setState((s) => ({ ...s, index: i, showDone: false }));
  const finish = () => setState((s) => ({ ...s, showDone: true }));
  const togglePinyin = () => {
    saveShowPinyin(!showPinyin);
    setShowPinyin(!showPinyin);
  };

  const { units, run, index, fills, graded, showDone } = state;
  const n = units.length;
  const gradedList = Object.values(graded);
  const doneCount = gradedList.length;
  const score = gradedList.reduce((t, g) => t + g.score, 0);
  const set = units[index];
  const fill = fills[index] || emptyFill();
  const done = graded[index] || null;

  const update = (f) => setState((s) => ({ ...s, fills: { ...s.fills, [s.index]: f(s.fills[s.index] || emptyFill()) } }));
  const place = (w) => !done && update((f) => placeWord(f, w, set));
  const select = (i) => !done && update((f) => selectSlot(f, i));
  const submit = () => {
    if (done || !isFull(fill)) return;
    const g = { slots: fill.slots, ...gradeSet(set, fill.slots) };
    const key = readKey(set.id);
    if (g.score < 5 && getMark(key) !== 'r') setMark(key, 'r');
    setState((s) => ({ ...s, graded: { ...s.graded, [index]: g } }));
  };
  const next = () => (index + 1 < n ? go(index + 1) : finish());

  // A–F place a word, 1–5 pick a blank, Backspace empties it, Enter submits a full set or moves on
  // once graded; never while typing in a field. Enter and Space on a focused word or blank button do
  // not click it again.
  useEffect(() => {
    if (!n || showDone) return undefined;
    const onKey = (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t && t.tagName;
      const target =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)
          ? 'field'
          : t && t.closest && t.closest('[data-fill]')
          ? 'answer'
          : tag === 'BUTTON' || tag === 'A'
          ? 'control'
          : 'other';
      const action = fillKeyAction({ key: e.key, graded: !!done, full: isFull(fill), target });
      if (!action) return;
      e.preventDefault();
      if (action === 'none') return;
      if (action === 'next') next();
      else if (action === 'submit') submit();
      else if (action === 'clear') update(clearSlot);
      else if (action.startsWith('word:')) place(Number(action.slice(5)));
      else select(Number(action.slice(5)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const summary =
    scope === 'review'
      ? `Part ${part.id.slice(1)} · 🔁 Ôn câu sai · ${n} bộ`
      : scope === 'mix'
      ? `Part ${part.id.slice(1)} · 🎯 Luyện tổng hợp · ${n} bộ`
      : `Part ${part.id.slice(1)} · ${typeInfo.icon} ${typeInfo.name} · ${n} bộ`;

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">{scope === 'review' ? 'Chưa có bộ nào cần ôn. 🎉' : 'Dạng này đang được soạn.'}</div>
        <div className="controls">
          <Link to={hub} className="btn secondary">
            ← Part {part.id.slice(1)}
          </Link>
        </div>
      </div>
    );
  } else if (showDone) {
    const wrong = units.map((u, i) => [u, i]).filter(([, i]) => graded[i] && graded[i].score < 5);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {5 * doneCount} câu (Đã nộp {doneCount} / {n} bộ)
        </h2>
        {wrong.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Bộ có câu sai</div>
            {wrong.map(([u, i]) => (
              <div key={u.id} className="quiz-reveal bad">
                <button type="button" className="link-btn" onClick={() => go(i)}>
                  {typeName(u)} · {setLine(u)} → {graded[i].score}/5
                </button>
              </div>
            ))}
          </div>
        ) : doneCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa nộp bộ nào.</div>
        )}
        {scope === 'review' && (
          <div className="grammar-review-marks">
            <div className="quiz-label">Đánh dấu “Đã nắm” để bỏ khỏi danh sách cần ôn</div>
            {units.map((u) => (
              <div key={u.id} className="grammar-review-row">
                <span>
                  {typeName(u)} · {setLine(u)}
                </span>
                <button type="button" className={'mark-btn' + (getMark(readKey(u.id)) === 'k' ? ' active' : '')} data-s="k" onClick={() => toggleMark(readKey(u.id), 'k')}>
                  ✅ Đã nắm
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="controls">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(buildRun(wrong.map(([u]) => u)))}>
              🔁 Làm lại bộ sai
            </button>
          )}
          <button className="btn" onClick={() => restart(build())}>
            🔀 Làm lượt mới
          </button>
          <Link to={hub} className="btn secondary">
            ← Part {part.id.slice(1)}
          </Link>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Bộ {index + 1} / {n} · {typeName(set)}
        </div>
        <FillSet
          key={run + ':' + index}
          set={set}
          fill={fill}
          graded={done}
          showPinyin={showPinyin}
          onTogglePinyin={togglePinyin}
          onSelect={select}
          onPlace={place}
          onSubmit={submit}
        />
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ Bộ trước
          </button>
          {index + 1 < n ? (
            <button key={'next' + index} className="btn" autoFocus={!!done} onClick={next}>
              Bộ tiếp ▶
            </button>
          ) : (
            <button key={'done' + index} className="btn" autoFocus={!!done} onClick={next}>
              Xem kết quả ▶
            </button>
          )}
          {doneCount > 0 && index + 1 < n && (
            <button className="btn secondary" onClick={finish}>
              🏁 Kết quả ({score}/{5 * doneCount})
            </button>
          )}
        </div>
        <div className="fb-score">
          Đã nộp: {doneCount} / {n} bộ · Đúng: {score} câu
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to={hub} className="link-btn">
          ← Part {part.id.slice(1)}
        </Link>
        <span className="exercise-summary">{summary}</span>
      </div>
      {body}
      {n > 0 && (
        <div className="question-grid-wrap">
          <div className="question-grid-header">
            <span className="quiz-label">Danh sách bộ</span>
            <span className="question-grid-stat">
              Đã nộp {doneCount}/{n} (Đúng {score} câu)
            </span>
          </div>
          <div className="question-grid">
            {units.map((_, i) => {
              const g = graded[i];
              const cls = 'q-num' + (i === index && !showDone ? ' current' : '') + (g ? (g.score === 5 ? ' correct' : ' wrong') : '');
              return (
                <button key={i} type="button" className={cls} onClick={() => go(i)} aria-label={`Bộ ${i + 1}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
