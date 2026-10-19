import { useEffect, useState } from 'react';
import AudioPlayer from '../components/AudioPlayer.jsx';
import TrueFalseQuestion from '../components/TrueFalseQuestion.jsx';
import { useApp } from '../context/AppContext.jsx';
import { audioUrl, buildMix, buildRun, keyAction, listenKey, loadShowPinyin, partById, questionsOf, reviewQuestions, saveShowPinyin } from '../listening.js';
import { Link } from '../router.jsx';

const REVIEW_MAX = 30;
const MIX_COUNT = 10;
const answerText = (q) => (q.answer ? '对' : '错');

// A practice run over one question type of a part (scope "type"), a mix of all its types ("mix") or
// every "needs review" question of the part ("review"). Built once on mount; the shell remounts the
// page (key = viewVersion) when account data changes.
export default function ListeningPracticePage({ part: partId, scope, type }) {
  const { marks } = useApp();
  const { getMark, setMark, toggleMark } = marks;
  const part = partById(partId);
  const hub = '/listening/' + part.id;
  const typeInfo = part.types.find((t) => t.id === type);

  const build = () =>
    scope === 'review'
      ? buildRun(reviewQuestions(getMark, part), { max: REVIEW_MAX })
      : scope === 'mix'
      ? buildMix(part, MIX_COUNT)
      : buildRun(questionsOf(part, type));
  const fresh = (questions, run) => ({ questions, run, index: 0, answers: {}, showDone: false });
  const [state, setState] = useState(() => fresh(build(), 0));
  const [showPinyin, setShowPinyin] = useState(loadShowPinyin);
  const restart = (questions) => setState((s) => fresh(questions, s.run + 1));
  const go = (i) => setState((s) => ({ ...s, index: i, showDone: false }));
  const finish = () => setState((s) => ({ ...s, showDone: true }));
  const togglePinyin = () => {
    saveShowPinyin(!showPinyin);
    setShowPinyin(!showPinyin);
  };

  const { questions, run, index, answers, showDone } = state;
  const n = questions.length;
  const answerList = Object.values(answers);
  const answeredCount = answerList.length;
  const score = answerList.filter((a) => a.ok).length;
  const q = questions[index];
  const answered = answers[index] || null;

  const answer = (given) => {
    if (answered) return;
    const ok = given === q.answer;
    const key = listenKey(q.id);
    if (!ok && getMark(key) !== 'r') setMark(key, 'r');
    setState((s) => ({ ...s, answers: { ...s.answers, [index]: { given, ok } } }));
  };
  const next = () => (index + 1 < n ? go(index + 1) : finish());

  // 1 / ← = 对, 2 / → = 错, Enter = next once answered; never while typing in a field.
  useEffect(() => {
    if (!n || showDone) return undefined;
    const onKey = (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t && t.tagName;
      const target =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)
          ? 'field'
          : t && t.closest && t.closest('.fb-opt')
          ? 'answer'
          : tag === 'BUTTON' || tag === 'A'
          ? 'control'
          : 'other';
      const action = keyAction({ key: e.key, answered: !!answered, target });
      if (!action) return;
      e.preventDefault();
      if (action === 'next') next();
      else answer(action === 'true');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const summary =
    scope === 'review'
      ? `Part ${part.id.slice(1)} · 🔁 Ôn câu sai · ${n} câu`
      : scope === 'mix'
      ? `Part ${part.id.slice(1)} · 🎯 Luyện tổng hợp · ${n} câu`
      : `Part ${part.id.slice(1)} · ${typeInfo.icon} ${typeInfo.name} · ${n} câu`;

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">{scope === 'review' ? 'Chưa có câu nào cần ôn. 🎉' : 'Dạng này đang được soạn.'}</div>
        <div className="controls">
          <Link to={hub} className="btn secondary">
            ← Part {part.id.slice(1)}
          </Link>
        </div>
      </div>
    );
  } else if (showDone) {
    const wrong = questions.map((qq, i) => [qq, i]).filter(([, i]) => answers[i] && !answers[i].ok);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {n} (Đã làm {answeredCount} / {n} câu)
        </h2>
        {wrong.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Câu làm sai</div>
            {wrong.map(([qq, i]) => (
              <div key={qq.id} className="quiz-reveal bad">
                <button type="button" className="link-btn" onClick={() => go(i)}>
                  ★ {qq.statement} → {answerText(qq)}
                </button>
              </div>
            ))}
          </div>
        ) : answeredCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa trả lời câu nào.</div>
        )}
        {scope === 'review' && (
          <div className="grammar-review-marks">
            <div className="quiz-label">Đánh dấu “Đã nắm” để bỏ khỏi danh sách cần ôn</div>
            {questions.map((qq) => (
              <div key={qq.id} className="grammar-review-row">
                <span>★ {qq.statement}</span>
                <button type="button" className={'mark-btn' + (getMark(listenKey(qq.id)) === 'k' ? ' active' : '')} data-s="k" onClick={() => toggleMark(listenKey(qq.id), 'k')}>
                  ✅ Đã nắm
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="controls">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(buildRun(wrong.map(([qq]) => qq)))}>
              🔁 Làm lại câu sai
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
          Câu {index + 1} / {n} · Nghe rồi chọn Đúng hay Sai
        </div>
        <AudioPlayer key={run + ':' + index} src={audioUrl(q.id)} autoPlay={!answered} />
        <TrueFalseQuestion key={run + ':' + index + ':q'} q={q} answered={answered} onAnswer={answer} />
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            <div>
              {answered.ok ? '✅ Đúng' : '❌ Sai'} — đáp án: {answerText(q)}
            </div>
            <div className="lp-trans">
              <div className="quiz-label">
                Transcript
                <button type="button" className="link-btn small" onClick={togglePinyin}>
                  {showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin'}
                </button>
              </div>
              <div className="hz">{q.text}</div>
              {showPinyin && <div className="py">{q.pinyin}</div>}
              <div className="hz">★ {q.statement}</div>
              {showPinyin && <div className="py">{q.statementPinyin}</div>}
              <div className="quiz-reveal-sub">Dịch đoạn nghe: {q.vi}</div>
              <div className="quiz-reveal-sub">Dịch câu ★: {q.statementVi}</div>
              <div className="quiz-reveal-sub">💡 {q.explain}</div>
            </div>
          </div>
        )}
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ Câu trước
          </button>
          {index + 1 < n ? (
            <button key={'next' + index} className="btn" autoFocus={!!answered} onClick={next}>
              Câu tiếp ▶
            </button>
          ) : (
            <button key={'done' + index} className="btn" autoFocus={!!answered} onClick={next}>
              Xem kết quả ▶
            </button>
          )}
          {answeredCount > 0 && index + 1 < n && (
            <button className="btn secondary" onClick={finish}>
              🏁 Kết quả ({score}/{answeredCount})
            </button>
          )}
        </div>
        <div className="fb-score">
          Đã làm: {answeredCount} / {n} · Đúng: {score}
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
            <span className="quiz-label">Danh sách câu</span>
            <span className="question-grid-stat">
              Đã làm {answeredCount}/{n} (Đúng {score})
            </span>
          </div>
          <div className="question-grid">
            {questions.map((_, i) => {
              const a = answers[i];
              const cls = 'q-num' + (i === index && !showDone ? ' current' : '') + (a ? (a.ok ? ' correct' : ' wrong') : '');
              return (
                <button key={i} type="button" className={cls} onClick={() => go(i)} aria-label={`Câu ${i + 1}`}>
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
