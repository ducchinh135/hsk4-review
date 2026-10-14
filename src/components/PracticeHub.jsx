import { useApp } from '../context/AppContext.jsx';
import { QUIZ_TYPES, countApplicable, countQuestions } from '../quiz.js';
import { Link } from '../router.jsx';
import StudyBar from './StudyBar.jsx';

const DESC = {
  meaning: 'Thấy chữ Hán (từ & cụm từ kết hợp), chọn nghĩa tiếng Việt đúng.',
  hanzi: 'Thấy nghĩa tiếng Việt, chọn từ hoặc cụm từ chữ Hán đúng.',
  listen: 'Nghe phát âm từ hoặc cụm từ, chọn chữ Hán đúng.',
  pinyin: 'Thấy chữ Hán (từ & cụm từ), gõ pinyin (phải đúng dấu thanh).',
  fill: 'Chọn từ còn thiếu trong các câu ví dụ & bài tập ngữ cảnh.',
};

// Pick an exercise type for the words of the chosen lesson and filter.
export default function PracticeHub() {
  const { words, speech } = useApp();
  const canSpeak = speech.supported;
  return (
    <>
      <StudyBar />
      <div className="panel practice-hub">
        {QUIZ_TYPES.map(([type, label]) => {
          const n = countApplicable(words, type, { canSpeak });
          const qCount = countQuestions(words, type, { canSpeak });
          const note =
            type === 'listen' && !canSpeak
              ? 'Trình duyệt không hỗ trợ đọc'
              : n
              ? `${n} từ · ${qCount} câu hỏi`
              : 'Không có từ phù hợp';
          const body = (
            <>
              <div className="exercise-name">{label}</div>
              <div className="exercise-desc">{DESC[type]}</div>
              <div className="exercise-count">{note}</div>
            </>
          );
          return n ? (
            <Link key={type} to={'/vocab/practice/' + type} className="exercise-card">
              {body}
            </Link>
          ) : (
            <div key={type} className="exercise-card off" aria-disabled="true">
              {body}
            </div>
          );
        })}
      </div>
    </>
  );
}
