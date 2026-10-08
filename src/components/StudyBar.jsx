import { useApp } from '../context/AppContext.jsx';
import { LESSON_COLORS, VOCAB } from '../lessons.js';
import AudioBar from './AudioBar.jsx';
import FilterBar from './FilterBar.jsx';
import LessonTabs from './LessonTabs.jsx';

// Lesson picker, speech toggle and mark filter: shared by the pages that study a lesson.
export default function StudyBar() {
  const { lesson, selectLesson, marks, speech, counts, filter, fellBack, applyFilter, resetMarks } = useApp();
  return (
    <>
      <LessonTabs lesson={lesson} getMark={marks.getMark} onSelect={selectLesson} />
      <div className="lesson-title" style={{ color: LESSON_COLORS[lesson].a }}>
        {VOCAB[lesson].title}
      </div>
      <AudioBar speech={speech} />
      <FilterBar counts={counts} filter={filter} fellBack={fellBack} onFilter={applyFilter} onReset={resetMarks} />
    </>
  );
}
