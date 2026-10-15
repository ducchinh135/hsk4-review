import { useState } from 'react';
import ChoiceBlank from '../components/ChoiceBlank.jsx';
import LessonTabs from '../components/LessonTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  FILTER_NAMES,
  PAIR_BY_ID,
  buildCompareQuiz,
  compareKey,
  compareProgress,
  filterPairs,
  loadCompareFilter,
  pairTitle,
  pairsOf,
  retryCompareQuiz,
  reviewPairs,
} from '../compare.js';
import { LESSON_LABELS } from '../lessons.js';
import { Link } from '../router.jsx';

const REVIEW_MAX = 30;
const compareLink = (id) => '/compare#' + id;

// One practice run: every question of the chosen lesson's groups under the compare filter (scope
// "lesson"), or of every "needs review" group, at most 30 questions (scope "review"). Built once on
// mount; the shell remounts the page (key = viewVersion) when the lesson or account data changes.
export default function ComparePracticePage({ scope }) {
  const { lesson, selectLesson, marks } = useApp();
  const { getMark, setMark, toggleMark } = marks;
  const review = scope === 'review';
  const max = review ? REVIEW_MAX : Infinity;

  const [source] = useState(() => {
    const filter = loadCompareFilter();
    const picked = review ? { points: reviewPairs(getMark), fellBack: false } : filterPairs(pairsOf(lesson), filter, getMark);
    return { ...picked, filter };
  });
  const fresh = (questions, run) => ({ questions, run, index: 0, answers: {}, showDone: false });
  const [state, setState] = useState(() => fresh(buildCompareQuiz(source.points, { max }), 0));
  const restart = (questions) => setState((s) => fresh(questions, s.run + 1));
  const go = (i) => setState((s) => ({ ...s, index: i, showDone: false }));
  const finish = () => setState((s) => ({ ...s, showDone: true }));

  const { questions, run, index, answers, showDone } = state;
  const n = questions.length;
  const answerList = Object.values(answers);
  const answeredCount = answerList.length;
  const score = answerList.filter((a) => a.ok).length;

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">{review ? 'Chưa có nhóm từ nào cần ôn. 🎉' : 'Nội dung bài này đang được soạn.'}</div>
        <div className="controls">
          <Link to="/compare" className="btn secondary">
            ⚖️ Về So sánh
          </Link>
        </div>
      </div>
    );
  } else if (showDone) {
    const wrongQs = questions.filter((_, i) => answers[i] && !answers[i].ok);
    const wrongIds = [...new Set(wrongQs.map((q) => q.pairId))];
    const runIds = [...new Set(questions.map((q) => q.pairId))];
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {n} (Đã làm {answeredCount} / {n} câu)
        </h2>
        {wrongIds.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Nhóm từ có câu sai</div>
            {wrongIds.map((id) => (
              <div key={id} className="quiz-reveal bad">
                <Link to={compareLink(id)}>⚖️ {pairTitle(PAIR_BY_ID[id])}</Link>
              </div>
            ))}
          </div>
        ) : answeredCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa trả lời câu nào.</div>
        )}
        {review && (
          <div className="grammar-review-marks">
            <div className="quiz-label">Đánh dấu “Đã nắm” để bỏ khỏi danh sách cần ôn</div>
            {runIds.map((id) => {
              const key = compareKey(id);
              return (
                <div key={id} className="grammar-review-row">
                  <span>{pairTitle(PAIR_BY_ID[id])}</span>
                  <button type="button" className={'mark-btn' + (getMark(key) === 'k' ? ' active' : '')} data-s="k" onClick={() => toggleMark(key, 'k')}>
                    ✅ Đã nắm
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="controls">
          {wrongQs.length > 0 && (
            <button className="btn" onClick={() => restart(retryCompareQuiz(wrongQs))}>
              🔁 Làm lại câu sai
            </button>
          )}
          <button className="btn" onClick={() => restart(buildCompareQuiz(source.points, { max }))}>
            🔀 Làm lượt mới
          </button>
          <Link to="/compare" className="btn secondary">
            ⚖️ Về So sánh
          </Link>
        </div>
      </div>
    );
  } else {
    const q = questions[index];
    const answered = answers[index] || null;
    const answer = (given) => {
      if (answered) return;
      const ok = given === q.answer;
      const key = compareKey(q.pairId);
      if (!ok && getMark(key) !== 'r') setMark(key, 'r');
      setState((s) => ({ ...s, answers: { ...s.answers, [index]: { given, ok } } }));
    };
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {n} · Chọn từ đúng điền vào chỗ trống
        </div>
        <ChoiceBlank key={run + ':' + index} q={q} answered={answered} onAnswer={answer} />
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            <div>{answered.ok ? '✅ Đúng' : '❌ Sai'}</div>
            <div className="quiz-reveal-sub">{q.explain}</div>
            <div className="quiz-reveal-sub">
              <Link to={compareLink(q.pairId)}>⚖️ Xem so sánh: {pairTitle(PAIR_BY_ID[q.pairId])}</Link>
            </div>
          </div>
        )}
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ Câu trước
          </button>
          {index + 1 < n ? (
            <button key={'next' + index} className="btn" autoFocus={!!answered} onClick={() => go(index + 1)}>
              Câu tiếp ▶
            </button>
          ) : (
            <button key={'done' + index} className="btn" autoFocus={!!answered} onClick={finish}>
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
      {!review && <LessonTabs lesson={lesson} getMark={getMark} onSelect={selectLesson} progress={compareProgress(getMark)} />}
      <div className="exercise-top">
        <Link to="/compare" className="link-btn">
          ← So sánh
        </Link>
        <span className="exercise-summary">
          {review ? 'Ôn các nhóm cần ôn' : `${LESSON_LABELS[lesson]} · ${FILTER_NAMES[source.filter]}`} · {source.points.length} nhóm · {n} câu
        </span>
      </div>
      {source.fellBack && <div className="filter-note">Chưa có nhóm nào ở mục “{FILTER_NAMES[source.filter]}” nên đang luyện cả bài.</div>}
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
