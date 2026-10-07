import { useState } from 'react';
import { range, shuffle } from '../lessons.js';
import CardsPanel from './CardsPanel.jsx';
import QuizPanel from './QuizPanel.jsx';
import ReviewPanel from './ReviewPanel.jsx';

// Holds the progress of the lesson modes so switching tabs keeps your place.
// App remounts this (via `key`) whenever the lesson or filter changes.
export default function Study({ mode, lesson, words, lessonWords, marks, srs, speech }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [review, setReview] = useState(() => ({ order: shuffle(range(words.length)), index: 0 }));
  const [quiz, setQuiz] = useState(null);
  const { getMark, setMark, toggleMark } = marks;

  if (mode === 'srs') return null; // stays mounted so the other tabs keep their place
  if (mode === 'cards') {
    return <CardsPanel lesson={lesson} words={words} index={cardIndex} setIndex={setCardIndex} getMark={getMark} toggleMark={toggleMark} speech={speech} />;
  }
  if (mode === 'review') {
    return <ReviewPanel words={words} state={review} setState={setReview} getMark={getMark} toggleMark={toggleMark} speech={speech} />;
  }
  return (
    <QuizPanel
      words={words}
      lessonWords={lessonWords}
      state={quiz}
      setState={setQuiz}
      getMark={getMark}
      setMark={setMark}
      lapse={srs.lapse}
      speech={speech}
    />
  );
}
