import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { EXAM_MINUTES, LETTERS, TOTAL, answeredCount, examKey, filledText, gradeTest, mmss, orderedSentences, questionsOf, saveResult, scaled, testByNo, toggleLetter, usedWords } from '../exam.js';
import { Link } from '../router.jsx';

const arrow = (s) => [...s].join(' → ');
const BLANK = '___';

// A text with one ___ (a dialogue has two lines), the blank drawn by `blank`.
function WithBlank({ text, blank }) {
  return text.split('\n').map((line, k) => {
    const [before, after] = line.split(BLANK);
    return (
      <div key={k} className="rd-text-line">
        {before}
        {after !== undefined && (
          <>
            {blank}
            {after}
          </>
        )}
      </div>
    );
  });
}

// What shows under a question once the test is graded.
function Reveal({ ok, children }) {
  return <div className={'quiz-reveal ' + (ok ? 'ok' : 'bad')}>{children}</div>;
}

// One full reading test (Q46-85) on a single paper. Answer everything in any order, submit (or let
// the 40-minute clock run out), then see the score and, under every question, the right answer, a
// translation and an explanation. Wrong questions are marked "needs review". Progress is not kept
// across a reload.
export default function ExamTestPage({ test: testNo }) {
  const { marks } = useApp();
  const test = testByNo(testNo);
  const questions = questionsOf(test);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // { score, byNo } once submitted
  const [left, setLeft] = useState(EXAM_MINUTES * 60);
  const [timed, setTimed] = useState(true);
  const submitted = result !== null;
  const latest = useRef(answers);
  latest.current = answers;

  const set = (no, v) => !submitted && setAnswers((a) => ({ ...a, [no]: v }));

  const submit = () => {
    if (submitted) return;
    const g = gradeTest(test, latest.current);
    for (const q of questions) if (!g.byNo[q.no] && marks.getMark(examKey(test.test, q.no)) !== 'r') marks.setMark(examKey(test.test, q.no), 'r');
    saveResult(test.test, g.score);
    setResult(g);
    window.scrollTo(0, 0);
  };
  const retry = () => {
    setAnswers({});
    setResult(null);
    setLeft(EXAM_MINUTES * 60);
    window.scrollTo(0, 0);
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (submitted || !timed) return undefined;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [submitted, timed]);
  useEffect(() => {
    if (left <= 0 && timed && !submitted) submitRef.current();
  }, [left, timed, submitted]);

  const done = answeredCount(test, answers);
  const okOf = (no) => submitted && result.byNo[no];
  const statusCls = (no) => (submitted ? (result.byNo[no] ? ' ok' : ' bad') : '');
  const jump = (no) => document.getElementById('q' + no)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // ---- part 1: a word bank and five blanks per set
  const part1 = test.reading.part1.sets.map((s) => {
    const used = usedWords(s, answers);
    return (
      <div key={s.range[0]} className="rd-set">
        <div className="rd-words">
          {s.words.map((w, k) => (
            <span key={k} className={'rd-word' + (used.has(k) ? ' used' : '')}>
              <b>{LETTERS[k]}</b> {w}
            </span>
          ))}
        </div>
        <div className="rd-line example">
          <span className="rd-num">例如</span>
          <div>
            <WithBlank text={filledText(s.example.text, `（${LETTERS[s.example.answer]}）`)} blank={null} />
          </div>
        </div>
        {s.items.map((it) => {
          const v = answers[it.no];
          const select = (
            <select
              className={'rd-blank' + statusCls(it.no)}
              value={v === undefined ? '' : v}
              disabled={submitted}
              aria-label={`Câu ${it.no}`}
              onChange={(e) => set(it.no, e.target.value === '' ? undefined : Number(e.target.value))}
            >
              <option value="">—</option>
              {s.words.map((w, k) => (
                <option key={k} value={k} disabled={k === s.example.answer}>
                  {LETTERS[k]} {w}
                </option>
              ))}
            </select>
          );
          return (
            <div key={it.no} id={'q' + it.no} className="rd-line">
              <span className="rd-num">{it.no}.</span>
              <div>
                <WithBlank text={it.text} blank={select} />
                {submitted && (
                  <div className="rd-item-explain">
                    <Reveal ok={okOf(it.no)}>
                      {okOf(it.no) ? '✅ Đúng' : `❌ Sai — đáp án: ${LETTERS[it.answer]} ${s.words[it.answer]}`}
                    </Reveal>
                    <div className="hz">{filledText(it.text, s.words[it.answer])}</div>
                    <div className="quiz-reveal-sub">{it.vi}</div>
                    <div className="quiz-reveal-sub">💡 {it.explain}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  });

  // ---- part 2: tap the three sentences in order
  const part2 = test.reading.part2.questions.map((q) => {
    const order = answers[q.no] || '';
    return (
      <div key={q.no} id={'q' + q.no} className="rd-set">
        <div className="rd-num">{q.no}.</div>
        <div className="rd-slots">
          {[0, 1, 2].map((i) =>
            order[i] === undefined ? (
              <div key={i} className="rd-slot empty">
                {i + 1}
              </div>
            ) : (
              <button key={i} type="button" className={'rd-slot' + statusCls(q.no)} disabled={submitted} onClick={() => set(q.no, toggleLetter(order, 'ABC'.indexOf(order[i])))}>
                <b className="rd-letter">{order[i]}</b> {q.sentences['ABC'.indexOf(order[i])]}
              </button>
            )
          )}
        </div>
        {!submitted && (
          <div className="rd-pool">
            {[0, 1, 2]
              .filter((k) => !order.includes('ABC'[k]))
              .map((k) => (
                <button key={k} type="button" className="rd-sent" onClick={() => set(q.no, toggleLetter(order, k))}>
                  <b className="rd-letter">{'ABC'[k]}</b> {q.sentences[k]}
                </button>
              ))}
          </div>
        )}
        {submitted && (
          <div className="rd-item-explain">
            <Reveal ok={okOf(q.no)}>{okOf(q.no) ? `✅ Đúng: ${arrow(q.answer)}` : `❌ Sai${order.length === 3 ? ` — bạn xếp ${arrow(order)}` : ''} · Đúng: ${arrow(q.answer)}`}</Reveal>
            <p className="rd-para">{orderedSentences(q).join('')}</p>
            <div className="quiz-reveal-sub">{q.vi}</div>
            <div className="quiz-reveal-sub">💡 {q.explain}</div>
          </div>
        )}
      </div>
    );
  });

  // ---- part 3: a passage and its one or two questions
  const part3 = test.reading.part3.passages.map((p) => (
    <div key={p.range[0]} className="rd-set">
      <div className="rd-passage">
        <div className="hz">{p.text}</div>
        {submitted && <div className="vi">{p.vi}</div>}
      </div>
      {p.questions.map((q) => {
        const given = answers[q.no];
        return (
          <div key={q.no} id={'q' + q.no} className="rd-q">
            <div className="rd-q-text">
              {q.no}. {q.text}
            </div>
            <div className="lp-choices">
              {q.options.map((o, k) => {
                let cls = 'fb-opt text' + (given === k && !submitted ? ' sel' : '');
                if (submitted) {
                  if (k === q.answer) cls += ' correct';
                  else if (k === given) cls += ' wrong';
                }
                return (
                  <button key={k} type="button" className={cls} disabled={submitted} onClick={() => set(q.no, given === k ? undefined : k)}>
                    <span className="lp-letter">{LETTERS[k]}.</span> {o}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <>
                <Reveal ok={okOf(q.no)}>
                  {given === undefined ? '⚪ Chưa trả lời' : okOf(q.no) ? '✅ Đúng' : '❌ Sai'} — đáp án: {LETTERS[q.answer]}
                </Reveal>
                <div className="quiz-reveal-sub">💡 {q.explain}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  ));

  const wrong = submitted ? questions.filter((q) => !result.byNo[q.no]) : [];

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to="/exam" className="link-btn">
          ← Các đề
        </Link>
        <span className="exercise-summary">
          Đề số {test.test} · Đọc · {TOTAL} câu
        </span>
      </div>

      {submitted ? (
        <div className="fillblank-box quiz-done">
          <h2>
            Kết quả: {result.score} / {TOTAL} câu · {scaled(result.score)} / 100 điểm
          </h2>
          {wrong.length ? (
            <div className="quiz-wrong">
              <div className="quiz-label">Câu làm sai (đã đánh dấu “cần ôn”)</div>
              <div className="question-grid">
                {wrong.map((q) => (
                  <button key={q.no} type="button" className="q-num wrong" onClick={() => jump(q.no)}>
                    {q.no}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="srs-note">🎉 Đúng cả {TOTAL} câu!</div>
          )}
          <div className="controls">
            <button type="button" className="btn" onClick={retry}>
              🔁 Làm lại đề này
            </button>
            <Link to="/exam" className="btn secondary">
              ← Các đề
            </Link>
          </div>
        </div>
      ) : (
        <div className="fillblank-box exam-bar">
          <div className="progress">
            Đã trả lời {done} / {TOTAL} câu · ⏱ {timed ? mmss(left) : 'không tính giờ'}
            <button type="button" className="link-btn small" onClick={() => setTimed((t) => !t)}>
              {timed ? 'Tắt đồng hồ' : 'Bật đồng hồ'}
            </button>
          </div>
          <div className="question-grid">
            {questions.map((q) => {
              const a = answers[q.no];
              const has = q.kind === 'order' ? (a || '').length === 3 : a !== undefined;
              return (
                <button key={q.no} type="button" className={'q-num' + (has ? ' correct' : '')} onClick={() => jump(q.no)} aria-label={`Câu ${q.no}`}>
                  {q.no}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <h3 className="quiz-label">第一部分 · Câu 46–55 · Chọn từ điền vào chỗ trống</h3>
      {part1}
      <h3 className="quiz-label">第二部分 · Câu 56–65 · Sắp xếp ba câu thành đoạn văn</h3>
      {part2}
      <h3 className="quiz-label">第三部分 · Câu 66–85 · Đọc hiểu</h3>
      {part3}

      {!submitted && (
        <div className="controls">
          <button type="button" className="btn" onClick={() => (done === TOTAL || window.confirm(`Mới trả lời ${done}/${TOTAL} câu. Nộp bài?`)) && submit()}>
            Nộp bài ({done}/{TOTAL})
          </button>
        </div>
      )}
    </div>
  );
}
