import { useState } from 'react';
import { ALL_WORDS, WORD_BY_HANZI } from '../lessons.js';
import { QUIZ_TYPES, buildQuiz } from '../quiz.js';
import ChoiceQuestion from './ChoiceQuestion.jsx';
import PinyinQuestion from './PinyinQuestion.jsx';

const SETTINGS_KEY = 'hsk4_quiz_settings';
const TYPE_LABEL = Object.fromEntries(QUIZ_TYPES);
const COUNTS = [
  [10, '10 câu'],
  [20, '20 câu'],
  ['all', 'Tất cả'],
];
const DEFAULTS = { types: QUIZ_TYPES.map(([t]) => t), count: 10, noTones: false };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (s && Array.isArray(s.types)) {
      return {
        types: s.types.filter((t) => TYPE_LABEL[t]),
        count: COUNTS.some(([n]) => n === s.count) ? s.count : DEFAULTS.count,
        noTones: !!s.noTones,
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

// state: null = settings screen, otherwise { questions, index, answered, results }.
// Lives in <Study>, so picking another lesson or filter starts over.
export default function QuizPanel({ words, lessonWords, state, setState, getMark, setMark, lapse, speech }) {
  const [settings, setSettingsState] = useState(loadSettings);
  const setSettings = (s) => {
    setSettingsState(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  };
  const canSpeak = speech.supported;
  const usable = settings.types.filter((t) => t !== 'listen' || canSpeak);

  const start = (pool, count = settings.count) => {
    speech.cancel();
    const questions = buildQuiz(pool, { types: usable, count }, lessonWords, ALL_WORDS, { canSpeak });
    setState({ questions, index: 0, answered: null, results: [] });
  };

  if (!state) {
    return (
      <div className="panel">
        <div className="fillblank-box quiz-setup">
          <h2>📝 Quiz — {words.length} từ</h2>
          <div className="quiz-group">
            <div className="quiz-label">Dạng câu hỏi</div>
            {QUIZ_TYPES.map(([t, label]) => {
              const off = t === 'listen' && !canSpeak;
              return (
                <label key={t} className={'quiz-check' + (off ? ' off' : '')}>
                  <input
                    type="checkbox"
                    disabled={off}
                    checked={!off && settings.types.includes(t)}
                    onChange={(e) =>
                      setSettings({ ...settings, types: e.target.checked ? [...settings.types, t] : settings.types.filter((x) => x !== t) })
                    }
                  />
                  {label}
                  {off && ' (trình duyệt không hỗ trợ đọc)'}
                </label>
              );
            })}
          </div>
          <div className="quiz-group">
            <div className="quiz-label">Số câu</div>
            <div className="filter-chips">
              {COUNTS.map(([n, label]) => (
                <button key={n} type="button" className={'chip' + (settings.count === n ? ' active' : '')} onClick={() => setSettings({ ...settings, count: n })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="quiz-check">
            <input type="checkbox" checked={settings.noTones} onChange={(e) => setSettings({ ...settings, noTones: e.target.checked })} />
            Gõ pinyin: không cần dấu thanh
          </label>
          <button className="btn" disabled={!usable.length} onClick={() => start(words)}>
            ▶ Bắt đầu
          </button>
          {!usable.length && <div className="filter-note">Hãy chọn ít nhất một dạng câu hỏi.</div>}
        </div>
      </div>
    );
  }

  const { questions, index, answered, results } = state;

  if (!questions.length) {
    return (
      <div className="panel">
        <div className="fillblank-box quiz-done">
          <div className="filter-note">Không tạo được câu hỏi nào với các dạng đã chọn.</div>
          <button className="btn" onClick={() => setState(null)}>
            ⚙ Đổi cài đặt
          </button>
        </div>
      </div>
    );
  }

  if (index >= questions.length) {
    const score = results.filter((r) => r.ok).length;
    const wrong = results.filter((r) => !r.ok).map((r) => WORD_BY_HANZI[r.hanzi]);
    const byType = QUIZ_TYPES.map(([t, label]) => {
      const rs = results.filter((r) => r.type === t);
      return rs.length ? { label, ok: rs.filter((r) => r.ok).length, n: rs.length } : null;
    }).filter(Boolean);
    return (
      <div className="panel">
        <div className="fillblank-box quiz-done">
          <h2>
            Kết quả: {score} / {results.length}
          </h2>
          <ul className="quiz-bytype">
            {byType.map((x) => (
              <li key={x.label}>
                {x.label}: <b>{x.ok}/{x.n}</b>
              </li>
            ))}
          </ul>
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
              <button className="btn" onClick={() => start(wrong, 'all')}>
                🔁 Làm lại câu sai
              </button>
            )}
            <button className="btn" onClick={() => start(words)}>
              ▶ Lượt mới
            </button>
            <button className="btn secondary" onClick={() => setState(null)}>
              ⚙ Đổi cài đặt
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answer = (given, ok, result) => {
    if (answered) return;
    const h = q.word[0];
    if (!ok) {
      if (getMark(h) !== 'r') setMark(h, 'r');
      lapse(h); // back into today's daily review
    }
    speech.speak(q.type === 'fill' ? q.word[3] : h, 'quiz');
    setState({ ...state, answered: { given, ok, result }, results: [...results, { hanzi: h, type: q.type, ok }] });
  };
  const next = () => {
    speech.cancel();
    setState({ ...state, index: index + 1, answered: null });
  };

  return (
    <div className="panel">
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {questions.length} · {TYPE_LABEL[q.type]}
        </div>
        {q.type === 'pinyin' ? (
          <PinyinQuestion key={index} q={q} answered={answered} onAnswer={answer} noTones={settings.noTones} />
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
          <button className="btn secondary" onClick={() => setState(null)}>
            ✖ Dừng
          </button>
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
    </div>
  );
}
