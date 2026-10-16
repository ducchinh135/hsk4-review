import { LETTERS, compareProgress } from '../compare.js';

// One tab per letter that has groups, with the known/total count of that letter. Scrolls sideways
// inside its own box on narrow screens.
export default function LetterTabs({ letter, getMark, onSelect }) {
  const count = compareProgress(getMark);
  return (
    <div className="letter-tabs" role="group" aria-label="Chữ cái đầu pinyin">
      {LETTERS.map((l) => {
        const { done, total } = count(l);
        return (
          <button key={l} type="button" className={'letter-tab' + (l === letter ? ' active' : '')} data-l={l} aria-pressed={l === letter} onClick={() => onSelect(l)}>
            <span className="letter-name">{l}</span>
            <span className="tab-sub">
              {done}/{total} ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
