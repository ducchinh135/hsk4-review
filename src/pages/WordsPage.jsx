import { useState } from 'react';
import StudyBar from '../components/StudyBar.jsx';
import WordRow from '../components/WordRow.jsx';
import { useApp } from '../context/AppContext.jsx';

// The lesson's words as a list. `words` only changes when the lesson, filter or account data
// changes, so a row stays in place after you mark it.
export default function WordsPage() {
  const { words, marks, speech } = useApp();
  const [openHanzi, setOpenHanzi] = useState(null); // one expanded row at a time

  return (
    <>
      <StudyBar />
      <div className="panel word-list">
        {words.map((w) => (
          <WordRow
            key={w[0]}
            word={w}
            mark={marks.getMark(w[0])}
            open={openHanzi === w[0]}
            onToggleOpen={() => setOpenHanzi(openHanzi === w[0] ? null : w[0])}
            onMark={(s) => marks.toggleMark(w[0], s)}
            speech={speech}
          />
        ))}
      </div>
    </>
  );
}
