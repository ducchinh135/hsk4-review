import { useEffect, useRef, useState } from 'react';
import { ListeningPaper, ReadingPaper, WritingPaper } from '../components/ExamPaper.jsx';
import { useApp } from '../context/AppContext.jsx';
import { EXAM_MINUTES, SECTIONS, SECTION_NAME, TOTALS, WRITING_MINUTES, answeredCount, audioUrl, clipsOf, examKey, gapOf, gradeTest, isAnswered, isRight, listeningOf, mmss, saveResult, scaled, sectionQuestions, testByNo } from '../exam.js';
import { Link } from '../router.jsx';

const jump = (no) => document.getElementById('q' + no)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
const ICON = { listening: '🎧', reading: '📄', writing: '✍️' };
const COUNT = { listening: 45, reading: 40, writing: 15 };
const TABS = [...SECTIONS, 'writing'];

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
// moment it is answered (writing: when you press the button), with the transcript, translation and
// explanation, and the audio can be replayed at will. "real" (Thi thật): the whole listening section plays
// once at the exam's pace, then reading on a 40-minute clock, then writing on a 25-minute clock, and
// everything is graded at the end. Writing part 2 (a sentence about a picture) can only be checked by the
// learner against the book's sample ("Mình viết đúng" / "Chưa đúng"). Wrong questions are marked "needs
// review" in both. Progress is not kept across a reload.
export default function ExamRunPage({ test: testNo, mode }) {
  const { marks } = useApp();
  const test = testByNo(testNo);
  const real = mode === 'real';
  const all = TABS.flatMap((s) => sectionQuestions(test, s));
  const qOf = (no) => all.find((q) => q.no === no);

  const [answers, setAnswers] = useState({});
  const [shown, setShown] = useState({}); // study: questions already graded
  const [selfMarks, setSelfMarks] = useState({}); // writing part 2: 'ok' | 'bad' chosen by the learner
  const [phase, setPhase] = useState(real ? 'ready' : 'study'); // real: ready | listening | reading | writing | result
  const [tab, setTab] = useState('listening');
  const [nowQ, setNowQ] = useState(0);
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(EXAM_MINUTES * 60);
  const [leftW, setLeftW] = useState(WRITING_MINUTES * 60);
  const latest = useRef(answers);
  latest.current = answers;

  const markWrong = (no) => marks.getMark(examKey(test.test, no)) !== 'r' && marks.setMark(examKey(test.test, no), 'r');

  const onAnswer = (no, v) => {
    if (real ? phase === 'result' : shown[no]) return;
    setAnswers((a) => ({ ...a, [no]: v }));
    const q = qOf(no);
    // writing is typed text: it is graded when asked (onCheck), not on every keystroke
    if (!real && q.section !== 'writing' && isAnswered(q, v)) {
      setShown((s) => ({ ...s, [no]: true }));
      if (!isRight(q, v)) markWrong(no);
    }
  };
  const onCheck = (no) => {
    const q = qOf(no);
    setShown((s) => ({ ...s, [no]: true }));
    if (q.kind === 'sentence' && !isRight(q, answers[no])) markWrong(no);
  };
  const onSelf = (no, v) => {
    setSelfMarks((m) => ({ ...m, [no]: v }));
    if (v === 'bad') markWrong(no);
  };

  const finish = () => {
    const l = gradeTest(test, latest.current, 'listening');
    const r = gradeTest(test, latest.current, 'reading');
    const w = gradeTest(test, latest.current, 'writing');
    const byNo = { ...l.byNo, ...r.byNo, ...w.byNo };
    for (const no of Object.keys(byNo)) if (!byNo[no]) markWrong(Number(no));
    saveResult(test.test, { listening: l.score, reading: r.score, writing: w.score });
    setResult({ listening: l, reading: r, writing: w, byNo });
    setPhase('result');
    window.scrollTo(0, 0);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const reset = () => {
    setAnswers({});
    setShown({});
    setSelfMarks({});
    setResult(null);
    setLeft(EXAM_MINUTES * 60);
    setLeftW(WRITING_MINUTES * 60);
    setNowQ(0);
    setPhase(real ? 'ready' : 'study');
    window.scrollTo(0, 0);
  };

  // the reading and writing clocks; when one runs out the exam moves on
  useEffect(() => {
    if (!real || (phase !== 'reading' && phase !== 'writing')) return undefined;
    const set = phase === 'reading' ? setLeft : setLeftW;
    const id = setInterval(() => set((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [real, phase]);
  useEffect(() => {
    if (real && phase === 'reading' && left <= 0) setPhase('writing');
  }, [real, phase, left]);
  useEffect(() => {
    if (real && phase === 'writing' && leftW <= 0) finishRef.current();
  }, [real, phase, leftW]);

  const revealed = (no) => (real ? phase === 'result' : !!shown[no]);
  const okOf = (no) => (real ? !!result?.byNo[no] : isRight(qOf(no), answers[no]));
  const paperProps = { test, answers, onAnswer, revealed, okOf };
  const writingProps = { ...paperProps, onCheck: real ? undefined : onCheck, selfMarks, onSelf };
  const section = real ? (phase === 'writing' ? 'writing' : phase === 'reading' ? 'reading' : 'listening') : tab;

  const grid = (sec) => (
    <div className="question-grid">
      {sectionQuestions(test, sec).map((q) => {
        const has = isAnswered(q, answers[q.no]);
        let cls = has ? ' correct' : '';
        if (revealed(q.no)) cls = q.kind === 'free' ? (selfMarks[q.no] === 'ok' ? ' correct' : selfMarks[q.no] === 'bad' ? ' wrong' : '') : okOf(q.no) ? ' correct' : ' wrong';
        return (
          <button key={q.no} type="button" className={'q-num' + cls + (nowQ === q.no ? ' current' : '')} onClick={() => jump(q.no)} aria-label={`Câu ${q.no}`}>
            {q.no}
          </button>
        );
      })}
    </div>
  );
  const gridBox = (sec) => (
    <details className="exam-grid">
      <summary>Bảng số câu</summary>
      {grid(sec)}
    </details>
  );

  const studyDone = Object.keys(shown).length;
  const studyRight = Object.keys(shown).filter((no) => isRight(qOf(Number(no)), answers[no])).length;
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
            <p>Tiếp theo là phần <b>Đọc</b> (40 câu, {EXAM_MINUTES} phút), rồi phần <b>Viết</b> (15 câu, {WRITING_MINUTES} phút). Hết giờ thì tự chuyển phần. Khi nộp bài, cả ba phần được chấm cùng lúc.</p>
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

  const done = (sec) => answeredCount(test, answers, sec);

  let bar;
  if (phase === 'result') {
    const [l, r, w] = [result.listening, result.reading, result.writing];
    const wrongOf = (g) => Object.keys(g.byNo).filter((no) => !g.byNo[no]).map(Number);
    const free = sectionQuestions(test, 'writing').filter((q) => q.kind === 'free');
    const selfOk = free.filter((q) => selfMarks[q.no] === 'ok').length;
    bar = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {l.score + r.score} / 85 câu (Nghe + Đọc)
        </h2>
        <div className="srs-note">
          🎧 Nghe: {l.score}/{TOTALS.listening} ({scaled(l.score, TOTALS.listening)}/100) · 📄 Đọc: {r.score}/{TOTALS.reading} ({scaled(r.score, TOTALS.reading)}/100)
        </div>
        <div className="srs-note">
          ✍️ Viết: câu 86–95 đúng {w.score}/{TOTALS.writing} · câu 96–100 tự đối chiếu với câu mẫu bên dưới ({selfOk}/{free.length} câu bạn tự chấm đúng)
        </div>
        {[l, r, w].map((g, i) =>
          wrongOf(g).length ? (
            <div key={i} className="quiz-wrong">
              <div className="quiz-label">Câu sai phần {SECTION_NAME[TABS[i]]} (đã đánh dấu “cần ôn”)</div>
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
        <div className="progress">Đã trả lời {done('listening')} / 45 câu</div>
        {gridBox('listening')}
      </div>
    );
  } else if (real) {
    const reading = phase === 'reading';
    bar = (
      <div className="fillblank-box exam-bar">
        <div className="progress">
          Phần {reading ? 'Đọc' : 'Viết'} · Đã trả lời {done(phase)} / {COUNT[phase]} câu · ⏱ {mmss(reading ? left : leftW)}
        </div>
        {gridBox(phase)}
      </div>
    );
  } else {
    bar = (
      <div className="fillblank-box exam-bar">
        <div className="exam-tabs">
          {TABS.map((s) => (
            <button key={s} type="button" className={'btn' + (tab === s ? '' : ' secondary')} onClick={() => setTab(s)}>
              {ICON[s]} {SECTION_NAME[s]} ({COUNT[s]} câu)
            </button>
          ))}
        </div>
        <div className="progress">
          Đã làm {studyDone} / 100 câu · Đúng {studyRight}
        </div>
        {gridBox(tab)}
      </div>
    );
  }

  const showL = phase === 'result' || section === 'listening';
  const showR = phase === 'result' || section === 'reading';
  const showW = phase === 'result' || section === 'writing';
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
      {showW && (
        <>
          {phase === 'result' && <h2 className="quiz-label">✍️ Phần Viết</h2>}
          <WritingPaper {...writingProps} />
        </>
      )}
      {real && phase === 'listening' && (
        <div className="controls">
          <button type="button" className="btn secondary" onClick={() => window.confirm('Bỏ qua phần Nghe còn lại và sang phần Đọc?') && setPhase('reading')}>
            Bỏ qua phần Nghe → sang phần Đọc
          </button>
        </div>
      )}
      {real && phase === 'reading' && (
        <div className="controls">
          <button type="button" className="btn" onClick={() => (done('reading') === TOTALS.reading || window.confirm(`Mới trả lời ${done('reading')}/40 câu phần Đọc. Sang phần Viết?`)) && setPhase('writing')}>
            Xong phần Đọc → sang phần Viết ({done('reading')}/40)
          </button>
        </div>
      )}
      {real && phase === 'writing' && (
        <div className="controls">
          <button type="button" className="btn" onClick={() => (done('writing') === COUNT.writing || window.confirm(`Mới viết ${done('writing')}/15 câu. Nộp bài?`)) && finish()}>
            Nộp bài ({done('writing')}/15)
          </button>
        </div>
      )}
    </div>
  );
}
