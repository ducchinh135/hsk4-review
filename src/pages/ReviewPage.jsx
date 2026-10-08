import { useState } from 'react';
import CardsPanel from '../components/CardsPanel.jsx';
import ReviewPanel from '../components/ReviewPanel.jsx';
import StudyBar from '../components/StudyBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { range, shuffle } from '../lessons.js';

const MODE_KEY = 'hsk4_review_mode';
const MODES = [
  ['order', '📇 Theo thứ tự'],
  ['shuffle', '🔀 Xáo trộn'],
];

function loadMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'shuffle' ? 'shuffle' : 'order';
  } catch {
    return 'order';
  }
}

// Flip through the lesson's cards in order, or in shuffled order. The position lives here and
// resets when the lesson, filter or account data changes (the shell remounts pages on viewVersion).
export default function ReviewPage() {
  const { lesson, words, marks, speech } = useApp();
  const [mode, setMode] = useState(loadMode);
  const [cardIndex, setCardIndex] = useState(0);
  const [review, setReview] = useState(() => ({ order: shuffle(range(words.length)), index: 0 }));
  const { getMark, toggleMark } = marks;

  const pick = (m) => {
    speech.cancel();
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <StudyBar />
      <div className="filter-chips review-mode" role="group" aria-label="Kiểu ôn tập">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" className={'chip' + (m === mode ? ' active' : '')} onClick={() => pick(m)}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'order' ? (
        <CardsPanel lesson={lesson} words={words} index={cardIndex} setIndex={setCardIndex} getMark={getMark} toggleMark={toggleMark} speech={speech} />
      ) : (
        <ReviewPanel words={words} state={review} setState={setReview} getMark={getMark} toggleMark={toggleMark} speech={speech} />
      )}
    </>
  );
}
