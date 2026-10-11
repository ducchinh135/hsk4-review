import { useState } from 'react';
import ChoiceQuestion from '../components/ChoiceQuestion.jsx';
import { FILTER_LABELS } from '../components/FilterBar.jsx';
import PinyinQuestion from '../components/PinyinQuestion.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALL_WORDS, LESSON_LABELS, WORD_BY_HANZI } from '../lessons.js';
import { QUIZ_TYPES, buildQuiz } from '../quiz.js';
import { Link } from '../router.jsx';

const TYPE_LABEL = Object.fromEntries(QUIZ_TYPES);

// One practice run of a single exercise type with all questions of the lesson and a numbered grid to jump between questions.
export default function ExercisePage({ type }) {
  const { lesson, filter, words, lessonWords, marks, speech } = useApp();
  const { getMark, setMark } = marks;
  const canSpeak = speech.supported;

  // state: { questions, index, answers: { [i]: { given, ok, result, hanzi, type } }, showDone }
  const fresh = (pool) => ({
    questions: buildQuiz(pool, { types: [type], count: 'all' }, lessonWords, ALL_WORDS, { canSpeak }),
    index: 0,
    answers: {},
    showDone: false,
  });
  const [state, setState] = useState(() => fresh(words));
  const restart = (pool) => {
    speech.cancel();
    setState(fresh(pool));
  };
  const go = (i) => {
    speech.cancel();
    setState((s) => ({ ...s, index: i, showDone: false }));
  };

  const { questions, index, answers, showDone } = state;
  const n = questions.length;
  const answerList = Object.values(answers);
  const answeredCount = answerList.length;
  const score = answerList.filter((r) => r.ok).length;

  const back = (
    <Link to="/practice" className="btn secondary">
      ← Chọn dạng khác
    </Link>
  );

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">Không có từ nào phù hợp với dạng “{TYPE_LABEL[type]}” trong tập từ đang chọn.</div>
        <div className="controls">{back}</div>
      </div>
    );
  } else if (showDone) {
    const wrongHanzis = [...new Set(answerList.filter((r) => !r.ok).map((r) => r.hanzi))];
    const wrong = wrongHanzis.map((h) => WORD_BY_HANZI[h]).filter(Boolean);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {n} (Đã làm {answeredCount} / {n} câu)
        </h2>
        {wrong.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Các từ trả lời sai</div>
            {wrong.map((w) => (
              <div key={w[0]} className="quiz-reveal bad">
                {w[0]} · {w[1]} · {w[2]}
              </div>
            ))}
          </div>
        ) : answeredCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa trả lời câu nào.</div>
        )}
        <div className="controls">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(wrong)}>
              🔁 Làm lại câu sai
            </button>
          )}
          <button className="btn" onClick={() => restart(words)}>
            🔀 Xáo trộn làm lại
          </button>
          {back}
        </div>
      </div>
    );
  } else {
    const q = questions[index];
    const answered = answers[index] || null;
    const target = q.target || q.word;
    const sentence = q.sentence || q.word[3];
    const sentenceVi = q.sentenceVi ?? q.word[4];
    const answer = (given, ok, result) => {
      if (answered) return;
      const h = q.word[0];
      if (!ok) {
        if (getMark(h) !== 'r') setMark(h, 'r');
      }
      speech.speak(q.type === 'fill' ? sentence : target[0], 'quiz');
      setState((s) => ({
        ...s,
        answers: { ...s.answers, [index]: { given, ok, result, hanzi: h, type: q.type } },
      }));
    };
    const sectionBadge = q.isExtended
      ? q.type === 'fill'
        ? '📗 Câu mở rộng'
        : '📗 Từ mở rộng'
      : '📘 Từ vựng chính';
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {n} · {TYPE_LABEL[q.type]} · <span className={'q-section-tag' + (q.isExtended ? ' ext' : ' core')}>{sectionBadge}</span>
        </div>
        {q.type === 'pinyin' ? (
          <PinyinQuestion key={index} q={q} answered={answered} onAnswer={answer} />
        ) : (
          <ChoiceQuestion key={index} q={q} answered={answered} onAnswer={answer} speech={speech} />
        )}
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            <div>
              {answered.ok ? '✅ ' : '❌ '}
              {target[0]} · {target[1]} · {target[2]}
            </div>
            {q.isPhrase && (
              <div className="quiz-reveal-sub">
                Từ vựng bài: {q.word[0]} · {q.word[1]} · {q.word[2]}
              </div>
            )}
            {q.type === 'fill' && sentenceVi && (
              <div className="quiz-reveal-sub">
                {sentence} — {sentenceVi}
              </div>
            )}
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
            <button key={'done' + index} className="btn" autoFocus={!!answered} onClick={() => setState((s) => ({ ...s, showDone: true }))}>
              Xem kết quả ▶
            </button>
          )}
          {answeredCount > 0 && index + 1 < n && (
            <button className="btn secondary" onClick={() => setState((s) => ({ ...s, showDone: true }))}>
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

  const coreIndices = [];
  const extIndices = [];
  questions.forEach((q, i) => {
    if (q.isExtended) extIndices.push(i);
    else coreIndices.push(i);
  });

  const renderGridGroup = (indices, title, subtitle) => {
    if (!indices.length) return null;
    const doneInGroup = indices.filter((i) => answers[i]).length;
    const okInGroup = indices.filter((i) => answers[i]?.ok).length;
    return (
      <div className="question-grid-wrap">
        <div className="question-grid-header">
          <span className="quiz-label">{title}</span>
          <span className="question-grid-stat">
            {subtitle} · Đã làm {doneInGroup}/{indices.length} (Đúng {okInGroup})
          </span>
        </div>
        <div className="question-grid">
          {indices.map((i) => {
            const a = answers[i];
            const cls =
              'q-num' +
              (i === index && !showDone ? ' current' : '') +
              (a ? (a.ok ? ' correct' : ' wrong') : '');
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => go(i)}
                aria-label={`Câu ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to="/practice" className="link-btn">
          ← Chọn dạng khác
        </Link>
        <span className="exercise-summary">
          {TYPE_LABEL[type]} · {LESSON_LABELS[lesson]} · {FILTER_LABELS[filter]} · {words.length} từ · {n} câu
        </span>
      </div>
      {body}
      {n > 0 && (
        <>
          {renderGridGroup(
            coreIndices,
            `📘 Phần 1: Từ vựng chính (Câu 1 – ${coreIndices.length})`,
            'Ôn từ gốc trong bài'
          )}
          {renderGridGroup(
            extIndices,
            `📗 Phần 2: ${type === 'fill' ? 'Câu bài tập mở rộng' : 'Từ & cụm từ mở rộng'} (Câu ${coreIndices.length + 1} – ${n})`,
            type === 'fill' ? 'Luyện thêm ngữ cảnh câu mới' : 'Luyện cụm từ ghép theo sách HSK 4'
          )}
        </>
      )}
    </div>
  );
}
