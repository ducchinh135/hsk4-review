import { LETTERS6, filledText, isFull, usedWords } from '../reading.js';

const BLANK = '___';

// A text with one ___ (a dialogue item has two lines), the blank drawn by `blank()`.
function WithBlank({ text, blank }) {
  return text.split('\n').map((line, k) => {
    const [before, after] = line.split(BLANK);
    return (
      <div key={k} className="rd-text-line">
        {before}
        {after !== undefined && (
          <>
            {blank()}
            {after}
          </>
        )}
      </div>
    );
  });
}

// One 选词填空 set: six words A–F (the example's word is used up front), the example and five
// sentences with a blank each. Pick a blank, then a word; submit once every blank is filled. After
// grading, each sentence shows the right word, the full sentence, pinyin, translation and the
// explanation. Holds no state: `fill` ({slots, cur}) and `graded` ({slots, results, score} or null)
// live in the page.
export default function FillSet({ set, fill, graded, showPinyin, onTogglePinyin, onSelect, onPlace, onSubmit }) {
  const slots = graded ? graded.slots : fill.slots;
  const used = usedWords(set, slots);
  const label = (w) => `${LETTERS6[w]} ${set.words[w].text}`;
  const full = isFull(fill);

  const blankFor = (i) => () => {
    const w = slots[i];
    if (graded) {
      const ok = graded.results[i];
      return (
        <span className={'rd-blank ' + (ok ? 'ok' : 'bad')}>
          {w === null ? '—' : label(w)}
          {!ok && <span className="rd-fix"> → {label(set.items[i].answer)}</span>}
        </span>
      );
    }
    return (
      <button type="button" data-fill="" className={'rd-blank' + (fill.cur === i ? ' sel' : '')} aria-label={`Chỗ trống ${i + 1}`} onClick={() => onSelect(i)}>
        {w === null ? ' ' : label(w)}
      </button>
    );
  };

  return (
    <div className="rd-set">
      <div className="rd-words">
        {set.words.map((wd, w) => {
          const isExample = w === set.example.answer;
          return (
            <button
              key={w}
              type="button"
              data-fill=""
              className={'rd-word' + (used.has(w) ? ' used' : '')}
              disabled={!!graded || isExample}
              onClick={() => onPlace(w)}
            >
              <b>{LETTERS6[w]}</b> {wd.text}
            </button>
          );
        })}
      </div>
      {!graded && (
        <div className="rd-note">
          {LETTERS6[set.example.answer]} đã dùng ở câu 例如 · điền 5 từ còn lại vào 5 chỗ trống
        </div>
      )}

      {graded && (
        <div className={'quiz-reveal ' + (graded.score === 5 ? 'ok' : 'bad')}>
          {graded.score === 5 ? '✅' : '❌'} {graded.score}/5
          <button type="button" className="link-btn small" onClick={onTogglePinyin}>
            {showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin'}
          </button>
        </div>
      )}

      <div className="rd-line example">
        <span className="rd-num">例如</span>
        <div>
          <WithBlank text={filledText(set.example.text, `（${LETTERS6[set.example.answer]}）`)} blank={() => null} />
        </div>
      </div>
      {set.items.map((item, i) => (
        <div key={i} className="rd-line">
          <span className="rd-num">{i + 1}.</span>
          <div>
            <WithBlank text={item.text} blank={blankFor(i)} />
            {graded && (
              <div className="rd-item-explain">
                <div className="hz">{filledText(item.text, set.words[item.answer].text)}</div>
                {showPinyin && <div className="py">{item.pinyin}</div>}
                <div className="quiz-reveal-sub">{item.vi}</div>
                <div className="quiz-reveal-sub">💡 {item.explain}</div>
              </div>
            )}
          </div>
        </div>
      ))}

      {!graded && (
        <div className="controls">
          <button type="button" className="btn" disabled={!full} onClick={onSubmit}>
            Nộp bộ ({slots.filter((w) => w !== null).length}/5)
          </button>
        </div>
      )}
    </div>
  );
}
