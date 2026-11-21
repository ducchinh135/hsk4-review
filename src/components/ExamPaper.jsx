import { LETTERS, audioUrl, clipsOf, filledText, hanCount, listeningOf, orderedSentences, toggleLetter, usedWords, writingOf } from '../exam.js';
import AudioPlayer from './AudioPlayer.jsx';

const arrow = (s) => [...s].join(' → ');
const BLANK = '___';
const WHO = { M: '男', F: '女', N: '', Q: '❓' };

// What shows under a question once it is revealed.
function Reveal({ ok, children }) {
  return <div className={'quiz-reveal ' + (ok ? 'ok' : 'bad')}>{children}</div>;
}

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

// The listening section: part 1 true/false statements, parts 2-3 with four printed options. The spoken
// text is only in the audio (shown once the question is revealed). Props:
//   answers {no: value}, onAnswer(no, value), revealed(no), okOf(no) -> graded state of each question,
//   audio: show the clips (practice and review) or hide them (the real exam plays them itself),
//   current: the question the exam audio is on (highlighted).
export function ListeningPaper({ test, answers, onAnswer, revealed, okOf, audio, current }) {
  const questions = listeningOf(test);
  const part = (n) => questions.filter((q) => q.part === n);
  const card = (q) => {
    const given = answers[q.no];
    const shown = revealed(q.no);
    const clips = audio ? clipsOf(test, q) : [];
    return (
      <div key={q.no} id={'q' + q.no} className={'rd-q exam-lq' + (current === q.no ? ' now' : '')}>
        <div className="rd-q-text">
          {q.no}.{q.kind === 'tf' ? ` ★ ${q.statement}` : q.part === 3 && shown ? ` ${q.question}` : ''}
        </div>
        {clips.map((c) => (
          <div key={c.file} className="exam-clip">
            <span className="exam-clip-label">🎧 {c.label}</span>
            <AudioPlayer src={audioUrl(c.file)} />
          </div>
        ))}
        <div className="lp-choices">
          {q.kind === 'tf'
            ? [true, false].map((v) => {
                let cls = 'fb-opt text' + (given === v && !shown ? ' sel' : '');
                if (shown) cls += v === q.answer ? ' correct' : given === v ? ' wrong' : '';
                return (
                  <button key={String(v)} type="button" className={cls} disabled={shown} onClick={() => onAnswer(q.no, given === v ? undefined : v)}>
                    {v ? '√ 对' : '× 错'}
                  </button>
                );
              })
            : q.options.map((o, k) => {
                let cls = 'fb-opt text' + (given === k && !shown ? ' sel' : '');
                if (shown) cls += k === q.answer ? ' correct' : given === k ? ' wrong' : '';
                return (
                  <button key={k} type="button" className={cls} disabled={shown} onClick={() => onAnswer(q.no, given === k ? undefined : k)}>
                    <span className="lp-letter">{LETTERS[k]}.</span> {o}
                  </button>
                );
              })}
        </div>
        {shown && (
          <div className="rd-item-explain">
            <Reveal ok={okOf(q.no)}>
              {given === undefined ? '⚪ Chưa trả lời' : okOf(q.no) ? '✅ Đúng' : '❌ Sai'} — đáp án: {q.kind === 'tf' ? (q.answer ? '√' : '×') : LETTERS[q.answer]}
            </Reveal>
            <div className="exam-script">
              {q.script.map((l, i) => (
                <div key={i} className="rd-text-line">
                  {WHO[l.who] && <b className="exam-who">{WHO[l.who]}：</b>}
                  {l.text}
                </div>
              ))}
              {q.part === 3 && <div className="rd-text-line">❓ {q.question}</div>}
            </div>
            {q.vi && <div className="quiz-reveal-sub" style={{ whiteSpace: 'pre-line' }}>{q.vi}</div>}
            {q.explain && <div className="quiz-reveal-sub">💡 {q.explain}</div>}
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <h3 className="quiz-label">第一部分 · Câu 1–10 · Nghe và chọn đúng (√) hay sai (×)</h3>
      {part(1).map(card)}
      <h3 className="quiz-label">第二部分 · Câu 11–25 · Nghe đoạn hội thoại ngắn</h3>
      {part(2).map(card)}
      <h3 className="quiz-label">第三部分 · Câu 26–45 · Nghe hội thoại và đoạn văn dài</h3>
      {part(3).map(card)}
    </>
  );
}

// The reading section: part 1 word banks and blanks, part 2 order three sentences, part 3 passages.
// Same props as ListeningPaper (no audio).
export function ReadingPaper({ test, answers, onAnswer, revealed, okOf }) {
  const r = test.reading;
  const cls = (no) => (revealed(no) ? (okOf(no) ? ' ok' : ' bad') : '');

  const part1 = r.part1.sets.map((s) => {
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
          const shown = revealed(it.no);
          const select = (
            <select
              className={'rd-blank' + cls(it.no)}
              value={v === undefined ? '' : v}
              disabled={shown}
              aria-label={`Câu ${it.no}`}
              onChange={(e) => onAnswer(it.no, e.target.value === '' ? undefined : Number(e.target.value))}
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
                {shown && (
                  <div className="rd-item-explain">
                    <Reveal ok={okOf(it.no)}>{okOf(it.no) ? '✅ Đúng' : `❌ Sai — đáp án: ${LETTERS[it.answer]} ${s.words[it.answer]}`}</Reveal>
                    <div className="hz">{filledText(it.text, s.words[it.answer])}</div>
                    {it.vi && <div className="quiz-reveal-sub">{it.vi}</div>}
                    {it.explain && <div className="quiz-reveal-sub">💡 {it.explain}</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  });

  const part2 = r.part2.questions.map((q) => {
    const order = answers[q.no] || '';
    const shown = revealed(q.no);
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
              <button key={i} type="button" className={'rd-slot' + cls(q.no)} disabled={shown} onClick={() => onAnswer(q.no, toggleLetter(order, 'ABC'.indexOf(order[i])))}>
                <b className="rd-letter">{order[i]}</b> {q.sentences['ABC'.indexOf(order[i])]}
              </button>
            )
          )}
        </div>
        {!shown && (
          <div className="rd-pool">
            {[0, 1, 2]
              .filter((k) => !order.includes('ABC'[k]))
              .map((k) => (
                <button key={k} type="button" className="rd-sent" onClick={() => onAnswer(q.no, toggleLetter(order, k))}>
                  <b className="rd-letter">{'ABC'[k]}</b> {q.sentences[k]}
                </button>
              ))}
          </div>
        )}
        {shown && (
          <div className="rd-item-explain">
            <Reveal ok={okOf(q.no)}>{okOf(q.no) ? `✅ Đúng: ${arrow(q.answer)}` : `❌ Sai${order.length === 3 ? ` — bạn xếp ${arrow(order)}` : ''} · Đúng: ${arrow(q.answer)}`}</Reveal>
            <p className="rd-para">{orderedSentences(q).join('')}</p>
            {q.vi && <div className="quiz-reveal-sub">{q.vi}</div>}
            {q.explain && <div className="quiz-reveal-sub">💡 {q.explain}</div>}
          </div>
        )}
      </div>
    );
  });

  const part3 = r.part3.passages.map((p) => (
    <div key={p.range[0]} className="rd-set">
      <div className="rd-passage">
        <div className="hz">{p.text}</div>
        {p.vi && p.questions.every((q) => revealed(q.no)) && <div className="vi">{p.vi}</div>}
      </div>
      {p.questions.map((q) => {
        const given = answers[q.no];
        const shown = revealed(q.no);
        return (
          <div key={q.no} id={'q' + q.no} className="rd-q">
            <div className="rd-q-text">
              {q.no}. {q.text}
            </div>
            <div className="lp-choices">
              {q.options.map((o, k) => {
                let c = 'fb-opt text' + (given === k && !shown ? ' sel' : '');
                if (shown) c += k === q.answer ? ' correct' : given === k ? ' wrong' : '';
                return (
                  <button key={k} type="button" className={c} disabled={shown} onClick={() => onAnswer(q.no, given === k ? undefined : k)}>
                    <span className="lp-letter">{LETTERS[k]}.</span> {o}
                  </button>
                );
              })}
            </div>
            {shown && (
              <>
                <Reveal ok={okOf(q.no)}>
                  {given === undefined ? '⚪ Chưa trả lời' : okOf(q.no) ? '✅ Đúng' : '❌ Sai'} — đáp án: {LETTERS[q.answer]}
                </Reveal>
                {q.explain && <div className="quiz-reveal-sub">💡 {q.explain}</div>}
              </>
            )}
          </div>
        );
      })}
    </div>
  ));

  return (
    <>
      <h3 className="quiz-label">第一部分 · Câu 46–55 · Chọn từ điền vào chỗ trống</h3>
      {part1}
      <h3 className="quiz-label">第二部分 · Câu 56–65 · Sắp xếp ba câu thành đoạn văn</h3>
      {part2}
      <h3 className="quiz-label">第三部分 · Câu 66–85 · Đọc hiểu</h3>
      {part3}
    </>
  );
}

// The writing section. Part 1 (Q86-95): word groups to put in order; tap one to add it to the box or
// type the whole sentence. Part 2 (Q96-100): a picture and a word, write a sentence. Props as for the
// other papers plus: onCheck(no) (practice mode: grade this question now), selfMarks {no: 'ok' | 'bad'} and
// onSelf(no, mark) for part 2, which only the learner can judge against the book's sample.
export function WritingPaper({ test, answers, onAnswer, revealed, okOf, onCheck, selfMarks, onSelf }) {
  const questions = writingOf(test);
  const part1 = questions.filter((q) => q.kind === 'sentence');
  const part2 = questions.filter((q) => q.kind === 'free');

  const checkBtn = (q, label) =>
    onCheck && !revealed(q.no) ? (
      <button type="button" className="btn" disabled={!(answers[q.no] || '').trim()} onClick={() => onCheck(q.no)}>
        {label}
      </button>
    ) : null;

  return (
    <>
      <h3 className="quiz-label">第一部分 · Câu 86–95 · Sắp xếp các từ thành câu hoàn chỉnh</h3>
      {part1.map((q) => {
        const shown = revealed(q.no);
        const text = answers[q.no] || '';
        return (
          <div key={q.no} id={'q' + q.no} className="rd-q">
            <div className="rd-q-text">{q.no}.</div>
            <div className="rd-words">
              {q.words.map((w, k) => (
                <button key={k} type="button" className="rd-word" disabled={shown} onClick={() => onAnswer(q.no, text + w)}>
                  {w}
                </button>
              ))}
            </div>
            <input
              className={'exam-write' + (shown ? (okOf(q.no) ? ' ok' : ' bad') : '')}
              type="text"
              lang="zh"
              spellcheck="false"
              value={text}
              disabled={shown}
              placeholder="Gõ hoặc bấm các từ để ghép thành câu"
              aria-label={`Câu ${q.no}`}
              onChange={(e) => onAnswer(q.no, e.target.value)}
            />
            {!shown && (
              <div className="controls exam-modes">
                <button type="button" className="btn secondary" disabled={!text} onClick={() => onAnswer(q.no, '')}>
                  Xoá
                </button>
                {checkBtn(q, 'Kiểm tra')}
              </div>
            )}
            {shown && (
              <div className="rd-item-explain">
                <Reveal ok={okOf(q.no)}>
                  {!text.trim() ? '⚪ Chưa trả lời' : okOf(q.no) ? '✅ Đúng' : '❌ Sai'} — đáp án: {q.answers.join(' / ')}
                </Reveal>
                {q.vi && <div className="quiz-reveal-sub">{q.vi}</div>}
                {q.explain && <div className="quiz-reveal-sub">💡 {q.explain}</div>}
              </div>
            )}
          </div>
        );
      })}
      <h3 className="quiz-label">第二部分 · Câu 96–100 · Nhìn tranh, dùng từ cho sẵn để viết câu</h3>
      {part2.map((q) => {
        const shown = revealed(q.no);
        const text = answers[q.no] || '';
        const mark = selfMarks[q.no];
        return (
          <div key={q.no} id={'q' + q.no} className="rd-q">
            <div className="rd-q-text">
              {q.no}. <span className="exam-word">{q.word}</span>
            </div>
            <img className="exam-pic" src={q.image} alt={`Tranh câu ${q.no}`} loading="lazy" />
            <textarea
              className="exam-write"
              rows="2"
              lang="zh"
              spellcheck="false"
              value={text}
              disabled={shown}
              placeholder={`Viết một câu có dùng “${q.word}”`}
              aria-label={`Câu ${q.no}`}
              onChange={(e) => onAnswer(q.no, e.target.value)}
            />
            <div className="exam-count">Số chữ: {hanCount(text)}</div>
            {!shown && <div className="controls exam-modes">{checkBtn(q, 'Xem câu mẫu')}</div>}
            {shown && (
              <div className="rd-item-explain">
                <div className="quiz-reveal-sub">Câu mẫu của sách:</div>
                <div className="hz">{q.answer}</div>
                {q.vi && <div className="quiz-reveal-sub">{q.vi}</div>}
                {q.explain && <div className="quiz-reveal-sub">💡 {q.explain}</div>}
                <div className="controls exam-modes">
                  <button type="button" className={'btn' + (mark === 'ok' ? '' : ' secondary')} onClick={() => onSelf(q.no, 'ok')}>
                    ✅ Mình viết đúng
                  </button>
                  <button type="button" className={'btn' + (mark === 'bad' ? '' : ' secondary')} onClick={() => onSelf(q.no, 'bad')}>
                    ❌ Chưa đúng
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
