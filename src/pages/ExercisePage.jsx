import { useState } from 'react';
import ChoiceQuestion from '../components/ChoiceQuestion.jsx';
import { FILTER_LABELS } from '../components/FilterBar.jsx';
import PinyinQuestion from '../components/PinyinQuestion.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALL_WORDS, LESSON_LABELS, WORD_BY_HANZI } from '../lessons.js';
import { PRACTICE_COUNT, QUIZ_TYPES, buildQuiz } from '../quiz.js';
import { Link } from '../router.jsx';

const TYPE_LABEL = Object.fromEntries(QUIZ_TYPES);

// One practice run of a single exercise type. Starts as soon as the page opens; leaving the page
// (or F5) drops an unfinished run.
export default function ExercisePage({ type }) {
  const { lesson, filter, words, lessonWords, marks, speech } = useApp();
  const { getMark, setMark } = marks;
  const canSpeak = speech.supported;

  // state: { questions, index, answered, results }
  const fresh = (pool, count = PRACTICE_COUNT) => ({
    questions: buildQuiz(pool, { types: [type], count }, lessonWords, ALL_WORDS, { canSpeak }),
    index: 0,
    answered: null,
    results: [],
  });
  const [state, setState] = useState(() => fresh(words));
  const restart = (pool, count) => {
    speech.cancel();
    setState(fresh(pool, count));
  };

  const { questions, index, answered, results } = state;
  const back = (
    <Link to="/practice" className="btn secondary">
      ← Chọn dạng khác
    </Link>
  );

  let body;
  if (!questions.length) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">Không có từ nào phù hợp với dạng “{TYPE_LABEL[type]}” trong tập từ đang chọn.</div>
        <div className="controls">{back}</div>
      </div>
    );
  } else if (index >= questions.length) {
    const score = results.filter((r) => r.ok).length;
    const wrong = results.filter((r) => !r.ok).map((r) => WORD_BY_HANZI[r.hanzi]);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {results.length}
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
        ) : (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        )}
        <div className="controls">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(wrong, 'all')}>
              🔁 Làm lại câu sai
            </button>
          )}
          <button className="btn" onClick={() => restart(words)}>
            ▶ Lượt mới
          </button>
          {back}
        </div>
      </div>
    );
  } else {
    const q = questions[index];
    const answer = (given, ok, result) => {
      if (answered) return;
      const h = q.word[0];
      if (!ok) {
        if (getMark(h) !== 'r') setMark(h, 'r');
      }
      speech.speak(q.type === 'fill' ? q.word[3] : h, 'quiz');
      setState({ ...state, answered: { given, ok, result }, results: [...results, { hanzi: h, type: q.type, ok }] });
    };
    const next = () => {
      speech.cancel();
      setState({ ...state, index: index + 1, answered: null });
    };
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {questions.length} · {TYPE_LABEL[q.type]}
        </div>
        {q.type === 'pinyin' ? (
          <PinyinQuestion key={index} q={q} answered={answered} onAnswer={answer} />
        ) : (
          <ChoiceQuestion key={index} q={q} answered={answered} onAnswer={answer} speech={speech} />
        )}
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            {answered.ok ? '✅ ' : '❌ '}
            {q.word[0]} · {q.word[1]} · {q.word[2]}
          </div>
        )}
        <div className="controls">
          <Link to="/practice" className="btn secondary">
            ✖ Dừng
          </Link>
          {answered && (
            <button key={'next' + index} className="btn" autoFocus onClick={next}>
              {index + 1 < questions.length ? 'Tiếp ▶' : 'Xem kết quả ▶'}
            </button>
          )}
        </div>
        <div className="fb-score">
          Điểm: {results.filter((r) => r.ok).length} / {results.length}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to="/practice" className="link-btn">
          ← Chọn dạng khác
        </Link>
        <span className="exercise-summary">
          {TYPE_LABEL[type]} · {LESSON_LABELS[lesson]} · {FILTER_LABELS[filter]} · {words.length} từ
        </span>
      </div>
      {body}
    </div>
  );
}
