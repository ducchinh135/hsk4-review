import { useState } from 'react';
import { range, shuffle } from '../lessons.js';
import CardsPanel from './CardsPanel.jsx';
import FillPanel from './FillPanel.jsx';
import ReviewPanel from './ReviewPanel.jsx';

// Holds the progress of all three modes so switching tabs keeps your place.
// App remounts this (via `key`) whenever the lesson or filter changes.
export default function Study({ mode, lesson, words, lessonWords, marks, speech }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [review, setReview] = useState(() => ({ order: shuffle(range(words.length)), index: 0 }));
  const [fill, setFill] = useState(() => ({ order: shuffle(range(words.length)), index: 0, correct: 0, total: 0 }));
  const { getMark, setMark, toggleMark } = marks;

  if (mode === 'cards') {
    return <CardsPanel lesson={lesson} words={words} index={cardIndex} setIndex={setCardIndex} getMark={getMark} toggleMark={toggleMark} speech={speech} />;
  }
  if (mode === 'review') {
    return <ReviewPanel words={words} state={review} setState={setReview} getMark={getMark} toggleMark={toggleMark} speech={speech} />;
  }
  return <FillPanel words={words} lessonWords={lessonWords} state={fill} setState={setFill} getMark={getMark} setMark={setMark} speech={speech} />;
}
