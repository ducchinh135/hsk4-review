import { useApp } from '../context/AppContext.jsx';
import { partById, typeCount } from '../listening.js';
import { Link } from '../router.jsx';

// How to do a part of the listening section: the format, the traps and a tip for each question type.
export default function ListeningTipsPage({ part: partId }) {
  const { speech } = useApp();
  const part = partById(partId);
  const counts = typeCount(part);
  const { intro, sections } = part.tips;

  const speakBtn = (text, id) =>
    speech.supported && (
      <button type="button" className={'speak-btn mini' + (speech.speakingId === id ? ' speaking' : '')} aria-label="Nghe câu" onClick={() => speech.speak(text, id)}>
        🔊
      </button>
    );

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to={'/listening/' + part.id} className="link-btn">
          ← Part {part.id.slice(1)}
        </Link>
        <span className="exercise-summary">Mẹo làm bài · {part.name}</span>
      </div>
      <div className="fillblank-box lp-tip">
        {intro && <p className="gp-meaning">{intro}</p>}
        {sections.map((s, i) => (
          <section key={i} className="lp-tip-section">
            <h3>{s.title}</h3>
            <p className="gp-meaning">{s.body}</p>
            {s.examples.map(([zh, py, vi], k) => (
              <div key={k} className="word-sentence-item">
                <div className="zh">
                  {zh} {speakBtn(zh, `lt-${i}-${k}`)}
                </div>
                <div className="gp-pinyin">{py}</div>
                <div className="vi">{vi}</div>
              </div>
            ))}
          </section>
        ))}
        <h3>Mẹo cho từng dạng</h3>
        {part.types.map((t) => (
          <section key={t.id} className="lp-tip-section">
            <h3>
              {t.icon} {t.name}
            </h3>
            <p className="gp-meaning">{t.tip}</p>
            {counts[t.id] > 0 && (
              <Link to={`/listening/${part.id}/practice/${t.id}`} className="btn">
                Luyện dạng này ▶
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
