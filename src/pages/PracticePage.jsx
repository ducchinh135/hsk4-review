import { useState } from 'react';
import QuizPanel from '../components/QuizPanel.jsx';
import StudyBar from '../components/StudyBar.jsx';
import { useApp } from '../context/AppContext.jsx';

// TEMPORARY: the old quiz, replaced by PracticeHub + ExercisePage in Task 6.
export default function PracticePage() {
  const { words, lessonWords, marks, srs, speech } = useApp();
  const [quiz, setQuiz] = useState(null);
  return (
    <>
      <StudyBar />
      <QuizPanel
        words={words}
        lessonWords={lessonWords}
        state={quiz}
        setState={setQuiz}
        getMark={marks.getMark}
        setMark={marks.setMark}
        lapse={srs.lapse}
        speech={speech}
      />
    </>
  );
}
