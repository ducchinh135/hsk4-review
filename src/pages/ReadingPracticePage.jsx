import { useEffect, useState } from 'react';
import FillSet from '../components/FillSet.jsx';
import OrderSentences from '../components/OrderSentences.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  REVIEW_MAX,
  buildMix,
  buildRun,
  clearSlot,
  emptyFill,
  fillKeyAction,
  gradeOrder,
  gradeSet,
  isFull,
  loadShowPinyin,
  orderKeyAction,
  orderedSentences,
  partById,
  pickSentence,
  placeWord,
  readKey,
  reviewUnits,
  saveShowPinyin,
  selectSlot,
  unitNoun,
  unitsOf,
  unpickSentence,
} from '../reading.js';
import { Link } from '../router.jsx';

const cut = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

// What differs between formats: the work on one unit before grading, grading it (a result with
// `score` out of `max` sentences), the keys and how a unit is named in lists.
const KITS = {
  fill: {
    max: 5,
    empty: emptyFill,
    full: isFull,
    grade: (u, w) => ({ slots: w.slots, ...gradeSet(u, w.slots) }),
    keyAction: fillKeyAction,
    progress: 'Bộ',
    line: (u) => u.words.map((w) => w.text).join('、'),
  },
  order: {
    max: 1,
    empty: () => [],
    full: (w) => w.length === 3,
    grade: (u, w) => {
      const g = gradeOrder(u, w);
      return { ...g, score: g.ok ? 1 : 0 };
    },
    keyAction: orderKeyAction,
    progress: 'Câu',
    line: (u) => cut(orderedSentences(u)[0].text, 20),
  },
};

// A practice run over one type of a reading part (scope "type"), a mix of its types ("mix") or every
// "needs review" unit of the part ("review"). Built once on mount; the shell remounts the page
// (key = viewVersion) when account data changes.
export default function ReadingPracticePage({ part: partId, scope, type }) {
  const { marks } = useApp();
  const { getMark, setMark, toggleMark } = marks;
  const part = partById(partId);
  const kit = KITS[part.format];
  const noun = unitNoun(part);
  const Noun = noun[0].toUpperCase() + noun.slice(1);
  const hub = '/reading/' + part.id;
  const typeInfo = part.types.find((t) => t.id === type);
  const typeName = (u) => part.types.find((t) => t.id === u.type).name;

  const build = () =>
    scope === 'review'
      ? buildRun(reviewUnits(getMark, part), { max: REVIEW_MAX[part.id] })
      : scope === 'mix'
      ? buildMix(part)
      : buildRun(unitsOf(part, type));
  const fresh = (units, run) => ({ units, run, index: 0, work: {}, graded: {}, showDone: false });
  const [state, setState] = useState(() => fresh(build(), 0));
  const [showPinyin, setShowPinyin] = useState(loadShowPinyin);
  const restart = (units) => setState((s) => fresh(units, s.run + 1));
  const go = (i) => setState((s) => ({ ...s, index: i, showDone: false }));
  const finish = () => setState((s) => ({ ...s, showDone: true }));
  const togglePinyin = () => {
    saveShowPinyin(!showPinyin);
    setShowPinyin(!showPinyin);
  };

  const { units, run, index, work, graded, showDone } = state;
  const n = units.length;
  const gradedList = Object.values(graded);
  const doneCount = gradedList.length;
  const score = gradedList.reduce((t, g) => t + g.score, 0);
  const unit = units[index];
  const w = work[index] || kit.empty();
  const done = graded[index] || null;

  const update = (f) => !done && setState((s) => ({ ...s, work: { ...s.work, [s.index]: f(s.work[s.index] || kit.empty()) } }));
  const submit = () => {
    if (done || !kit.full(w)) return;
    const g = kit.grade(unit, w);
    const key = readKey(unit.id);
    if (g.score < kit.max && getMark(key) !== 'r') setMark(key, 'r');
    setState((s) => ({ ...s, graded: { ...s.graded, [index]: g } }));
  };
  const next = () => (index + 1 < n ? go(index + 1) : finish());

  // Fill: A–F place a word, 1–5 pick a blank, Backspace empties it. Order: A–C place a sentence,
  // Backspace takes the last one out. Both: Enter submits once complete or moves on once graded;
  // never while typing in a field. Enter and Space on a focused word, blank or sentence button do
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
      const action = kit.keyAction({ key: e.key, graded: !!done, full: kit.full(w), target });
      if (!action) return;
      e.preventDefault();
      const arg = Number(action.split(':')[1]);
      if (action === 'none') return;
      if (action === 'next') next();
      else if (action === 'submit' || action === 'check') submit();
      else if (action === 'clear') update(clearSlot);
      else if (action === 'pop') update((p) => p.slice(0, -1));
      else if (action.startsWith('word:')) update((f) => placeWord(f, arg, unit));
      else if (action.startsWith('slot:')) update((f) => selectSlot(f, arg));
      else if (action.startsWith('pick:')) update((p) => pickSentence(p, arg));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const summary =
    scope === 'review'
      ? `Part ${part.id.slice(1)} · 🔁 Ôn câu sai · ${n} ${noun}`
      : scope === 'mix'
      ? `Part ${part.id.slice(1)} · 🎯 Luyện tổng hợp · ${n} ${noun}`
      : `Part ${part.id.slice(1)} · ${typeInfo.icon} ${typeInfo.name} · ${n} ${noun}`;

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">{scope === 'review' ? `Chưa có ${noun} nào cần ôn. 🎉` : 'Dạng này đang được soạn.'}</div>
        <div className="controls">
          <Link to={hub} className="btn secondary">
            ← Part {part.id.slice(1)}
          </Link>
        </div>
      </div>
    );
  } else if (showDone) {
    const wrong = units.map((u, i) => [u, i]).filter(([, i]) => graded[i] && graded[i].score < kit.max);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {kit.max * doneCount} câu (Đã làm {doneCount} / {n} {noun})
        </h2>
        {wrong.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">{part.format === 'fill' ? 'Bộ có câu sai' : 'Câu làm sai'}</div>
            {wrong.map(([u, i]) => (
              <div key={u.id} className="quiz-reveal bad">
                <button type="button" className="link-btn" onClick={() => go(i)}>
                  {typeName(u)} · {kit.line(u)} → {part.format === 'fill' ? `${graded[i].score}/5` : [...u.answer].join(' → ')}
                </button>
              </div>
            ))}
          </div>
        ) : doneCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa làm {noun} nào.</div>
        )}
        {scope === 'review' && (
          <div className="grammar-review-marks">
            <div className="quiz-label">Đánh dấu “Đã nắm” để bỏ khỏi danh sách cần ôn</div>
            {units.map((u) => (
              <div key={u.id} className="grammar-review-row">
                <span>
                  {typeName(u)} · {kit.line(u)}
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
              🔁 Làm lại {noun} sai
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
          {kit.progress} {index + 1} / {n} · {part.format === 'fill' ? typeName(unit) : 'Sắp xếp ba câu thành đoạn văn'}
        </div>
        {part.format === 'fill' ? (
          <FillSet
            key={run + ':' + index}
            set={unit}
            fill={w}
            graded={done}
            showPinyin={showPinyin}
            onTogglePinyin={togglePinyin}
            onSelect={(i) => update((f) => selectSlot(f, i))}
            onPlace={(k) => update((f) => placeWord(f, k, unit))}
            onSubmit={submit}
          />
        ) : (
          <OrderSentences
            key={run + ':' + index}
            q={unit}
            picked={w}
            graded={done}
            showPinyin={showPinyin}
            onTogglePinyin={togglePinyin}
            onPick={(k) => update((p) => pickSentence(p, k))}
            onUnpick={(k) => update((p) => unpickSentence(p, k))}
            onCheck={submit}
          />
        )}
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ {Noun} trước
          </button>
          {index + 1 < n ? (
            <button key={'next' + index} className="btn" autoFocus={!!done} onClick={next}>
              {Noun} tiếp ▶
            </button>
          ) : (
            <button key={'done' + index} className="btn" autoFocus={!!done} onClick={next}>
              Xem kết quả ▶
            </button>
          )}
          {doneCount > 0 && index + 1 < n && (
            <button className="btn secondary" onClick={finish}>
              🏁 Kết quả ({score}/{kit.max * doneCount})
            </button>
          )}
        </div>
        <div className="fb-score">
          Đã làm: {doneCount} / {n} {noun} · Đúng: {score} câu
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
            <span className="quiz-label">Danh sách {noun}</span>
            <span className="question-grid-stat">
              Đã làm {doneCount}/{n} (Đúng {score} câu)
            </span>
          </div>
          <div className="question-grid">
            {units.map((_, i) => {
              const g = graded[i];
              const cls = 'q-num' + (i === index && !showDone ? ' current' : '') + (g ? (g.score === kit.max ? ' correct' : ' wrong') : '');
              return (
                <button key={i} type="button" className={cls} onClick={() => go(i)} aria-label={`${Noun} ${i + 1}`}>
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
