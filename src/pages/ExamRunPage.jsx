import { useEffect, useRef, useState } from 'react';
import { ListeningPaper, ReadingPaper } from '../components/ExamPaper.jsx';
import { useApp } from '../context/AppContext.jsx';
import { EXAM_MINUTES, SECTIONS, SECTION_NAME, TOTALS, answeredCount, audioUrl, clipsOf, examKey, gapOf, gradeTest, isAnswered, listeningOf, mmss, saveResult, scaled, sectionQuestions, testByNo } from '../exam.js';
import { Link } from '../router.jsx';

const jump = (no) => document.getElementById('q' + no)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

// Plays the 45 listening clips of a real exam one after another with the exam's answering time after
// each (10 s in part 1, 17 s after): no pause, no replay. Tells the page which question it is on and
// calls `onEnd` after the last answering time.
function ExamAudio({ test, onNow, onEnd }) {
  const ref = useRef(null);
  const qs = listeningOf(test);
  const [cur, setCur] = useState(1);
  const [stage, setStage] = useState('play'); // 'play' | 'wait'
  const [wait, setWait] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const onNowRef = useRef(onNow);
  onNowRef.current = onNow;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const startWait = () => {
    setWait(gapOf(test, cur));
    setStage('wait');
  };

  useEffect(() => {
    onNowRef.current(cur);
    if (stage !== 'play') return;
    const a = ref.current;
    const clips = clipsOf(test, qs[cur - 1]);
    a.src = audioUrl(clips[clips.length - 1].file);
    setFailed(false);
    a.play().then(() => setBlocked(false), () => setBlocked(true));
    // one clip per question (the passage of a shared pair plays with its first question)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, stage]);

  useEffect(() => {
    if (stage !== 'wait') return undefined;
    const id = setInterval(() => setWait((w) => w - 1), 1000);
    return () => clearInterval(id);
  }, [stage, cur]);

  useEffect(() => {
    if (stage !== 'wait' || wait > 0) return;
    if (cur < 45) {
      setCur(cur + 1);
      setStage('play');
    } else onEndRef.current();
  }, [stage, wait, cur]);

  return (
    <div className="exam-audio">
      <audio ref={ref} onEnded={startWait} onError={() => { setFailed(true); startWait(); }} />
      <div className="progress">
        Câu {cur} / 45 · {stage === 'play' ? '🔊 Đang phát…' : `✍️ Thời gian làm bài: ${wait} giây`}
      </div>
      {blocked && stage === 'play' && (
        <button type="button" className="btn" onClick={() => ref.current.play().then(() => setBlocked(false), () => {})}>
          ▶ Bấm để phát
        </button>
      )}
      {failed && <div className="filter-note">⚠️ Không tải được audio câu này.</div>}
    </div>
  );
}

// One mock test in one of two modes. "study" (Ôn tập): a tab per section, every question is graded the
// moment it is answered, with the transcript, translation and explanation, and the audio can be
// replayed at will. "real" (Thi thật): the whole listening section plays once at the exam's pace, then
// the reading section on a 40-minute clock, and everything is graded at the end.
// Wrong questions are marked "needs review" in both. Progress is not kept across a reload.
export default function ExamRunPage({ test: testNo, mode }) {
  const { marks } = useApp();
  const test = testByNo(testNo);
  const real = mode === 'real';
  const all = [...sectionQuestions(test, 'listening'), ...sectionQuestions(test, 'reading')];
  const qOf = (no) => all.find((q) => q.no === no);

  const [answers, setAnswers] = useState({});
  const [shown, setShown] = useState({}); // study: questions already graded
  const [phase, setPhase] = useState(real ? 'ready' : 'study'); // real: ready | listening | reading | result
  const [tab, setTab] = useState('listening');
  const [nowQ, setNowQ] = useState(0);
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(EXAM_MINUTES * 60);
  const latest = useRef(answers);
  latest.current = answers;

  const markWrong = (no) => marks.getMark(examKey(test.test, no)) !== 'r' && marks.setMark(examKey(test.test, no), 'r');

  const onAnswer = (no, v) => {
    if (real ? phase === 'result' : shown[no]) return;
    setAnswers((a) => ({ ...a, [no]: v }));
    if (!real && isAnswered(qOf(no), v)) {
      setShown((s) => ({ ...s, [no]: true }));
      if (v !== qOf(no).answer) markWrong(no);
    }
  };

  const finish = () => {
    const l = gradeTest(test, latest.current, 'listening');
    const r = gradeTest(test, latest.current, 'reading');
    for (const no of Object.keys({ ...l.byNo, ...r.byNo })) if (!l.byNo[no] && !r.byNo[no]) markWrong(Number(no));
    saveResult(test.test, { listening: l.score, reading: r.score });
    setResult({ listening: l, reading: r, byNo: { ...l.byNo, ...r.byNo } });
    setPhase('result');
    window.scrollTo(0, 0);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const reset = () => {
    setAnswers({});
    setShown({});
    setResult(null);
    setLeft(EXAM_MINUTES * 60);
    setNowQ(0);
    setPhase(real ? 'ready' : 'study');
    window.scrollTo(0, 0);
  };

  // the reading clock
  useEffect(() => {
    if (!real || phase !== 'reading') return undefined;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [real, phase]);
  useEffect(() => {
    if (real && phase === 'reading' && left <= 0) finishRef.current();
  }, [real, phase, left]);

  const revealed = (no) => (real ? phase === 'result' : !!shown[no]);
  const okOf = (no) => (real ? !!result?.byNo[no] : answers[no] === qOf(no)?.answer);
  const paperProps = { test, answers, onAnswer, revealed, okOf };
  const section = real ? (phase === 'reading' ? 'reading' : 'listening') : tab;
  const grid = (sec) => (
    <div className="question-grid">
      {sectionQuestions(test, sec).map((q) => {
        const has = isAnswered(q, answers[q.no]);
        const cls = revealed(q.no) ? (okOf(q.no) ? ' correct' : ' wrong') : has ? ' correct' : '';
        return (
          <button key={q.no} type="button" className={'q-num' + cls + (nowQ === q.no ? ' current' : '')} onClick={() => jump(q.no)} aria-label={`Câu ${q.no}`}>
            {q.no}
          </button>
        );
      })}
    </div>
  );

  const studyDone = Object.keys(shown).length;
  const studyRight = Object.keys(shown).filter((no) => answers[no] === qOf(Number(no)).answer).length;
  const top = (
    <div className="exercise-top">
      <Link to="/exam" className="link-btn">
        ← Các đề
      </Link>
      <span className="exercise-summary">
        Đề số {test.test} · {real ? '⏱ Thi thật' : '📖 Ôn tập'}
      </span>
    </div>
  );

  // ---- real exam: before it starts
  if (real && phase === 'ready') {
    return (
      <div className="panel">
        {top}
        <div className="fillblank-box quiz-done">
          <h2>Thi thật · Đề số {test.test}</h2>
          <div className="rd-note">
            <p>Phần <b>Nghe</b> (45 câu, khoảng 30 phút): audio phát <b>một lần</b>, không tua lại, không dừng. Sau mỗi câu có thời gian làm bài (10 giây ở phần 1, 17 giây ở phần 2–3), rồi tự sang câu tiếp.</p>
            <p>Sau đó đến phần <b>Đọc</b> (40 câu, {EXAM_MINUTES} phút). Hết giờ hoặc khi nộp bài, cả hai phần được chấm cùng lúc.</p>
            <p>Hãy bật loa hoặc đeo tai nghe, và đừng đóng tab trong khi nghe.</p>
          </div>
          <div className="controls">
            <button type="button" className="btn" onClick={() => setPhase('listening')}>
              ▶ Bắt đầu phần Nghe
            </button>
          </div>
        </div>
      </div>
    );
  }

  const doneL = answeredCount(test, answers, 'listening');
  const doneR = answeredCount(test, answers, 'reading');
  const confirmEnd = (msg, fn) => window.confirm(msg) && fn();

  let bar;
  if (phase === 'result') {
    const l = result.listening;
    const r = result.reading;
    const wrongOf = (g) => Object.keys(g.byNo).filter((no) => !g.byNo[no]).map(Number);
    bar = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {l.score + r.score} / 85 câu
        </h2>
        <div className="srs-note">
          🎧 Nghe: {l.score}/{TOTALS.listening} ({scaled(l.score, TOTALS.listening)}/100) · 📄 Đọc: {r.score}/{TOTALS.reading} ({scaled(r.score, TOTALS.reading)}/100)
        </div>
        {[l, r].map((g, i) =>
          wrongOf(g).length ? (
            <div key={i} className="quiz-wrong">
              <div className="quiz-label">Câu sai phần {SECTION_NAME[SECTIONS[i]]} (đã đánh dấu “cần ôn”)</div>
              <div className="question-grid">
                {wrongOf(g).map((no) => (
                  <button key={no} type="button" className="q-num wrong" onClick={() => jump(no)}>
                    {no}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}
        <div className="controls">
          <button type="button" className="btn" onClick={reset}>
            🔁 Thi lại đề này
          </button>
          <Link to={`/exam/${test.test}/study`} className="btn secondary">
            📖 Ôn tập đề này
          </Link>
          <Link to="/exam" className="btn secondary">
            ← Các đề
          </Link>
        </div>
      </div>
    );
  } else if (real && phase === 'listening') {
    bar = (
      <div className="fillblank-box exam-bar">
        <ExamAudio test={test} onNow={setNowQ} onEnd={() => setPhase('reading')} />
        <div className="progress">Đã trả lời {doneL} / 45 câu</div>
        <details className="exam-grid">
          <summary>Bảng số câu</summary>
          {grid('listening')}
        </details>
      </div>
    );
  } else if (real) {
    bar = (
      <div className="fillblank-box exam-bar">
        <div className="progress">
          Phần Đọc · Đã trả lời {doneR} / 40 câu · ⏱ {mmss(left)}
        </div>
        <details className="exam-grid">
          <summary>Bảng số câu</summary>
          {grid('reading')}
        </details>
      </div>
    );
  } else {
    bar = (
      <div className="fillblank-box exam-bar">
        <div className="exam-tabs">
          {SECTIONS.map((s) => (
            <button key={s} type="button" className={'btn' + (tab === s ? '' : ' secondary')} onClick={() => setTab(s)}>
              {s === 'listening' ? '🎧' : '📄'} {SECTION_NAME[s]} ({TOTALS[s]} câu)
            </button>
          ))}
        </div>
        <div className="progress">
          Đã làm {studyDone} / 85 câu · Đúng {studyRight}
        </div>
        <details className="exam-grid">
          <summary>Bảng số câu</summary>
          {grid(tab)}
        </details>
      </div>
    );
  }

  const showL = phase === 'result' || section === 'listening';
  const showR = phase === 'result' || section === 'reading';
  return (
    <div className="panel">
      {top}
      {bar}
      {showL && (
        <>
          {phase === 'result' && <h2 className="quiz-label">🎧 Phần Nghe</h2>}
          <ListeningPaper {...paperProps} audio={!real || phase === 'result'} current={real && phase === 'listening' ? nowQ : 0} />
        </>
      )}
      {showR && (
        <>
          {phase === 'result' && <h2 className="quiz-label">📄 Phần Đọc</h2>}
          <ReadingPaper {...paperProps} />
        </>
      )}
      {real && phase === 'listening' && (
        <div className="controls">
          <button type="button" className="btn secondary" onClick={() => confirmEnd('Bỏ qua phần Nghe còn lại và sang phần Đọc?', () => setPhase('reading'))}>
            Bỏ qua phần Nghe → sang phần Đọc
          </button>
        </div>
      )}
      {real && phase === 'reading' && (
        <div className="controls">
          <button type="button" className="btn" onClick={() => (doneR === TOTALS.reading || window.confirm(`Mới trả lời ${doneR}/40 câu phần Đọc. Nộp bài?`)) && finish()}>
            Nộp bài ({doneR}/40)
          </button>
        </div>
      )}
    </div>
  );
}
