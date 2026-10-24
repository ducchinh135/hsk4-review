import { Link } from '../router.jsx';

// End-of-round screen shared by the games: figures, the missed words (already marked "needs review") and the replay buttons.
export default function GameSummary({ title = 'Kết quả', stats, missed, speech, onReplay, onReplayMissed }) {
  return (
    <div className="fillblank-box quiz-done game-summary">
      <h2>{title}</h2>
      <ul className="game-stats">
        {stats.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span> <strong>{value}</strong>
          </li>
        ))}
      </ul>
      {missed.length ? (
        <div className="quiz-wrong">
          <div className="quiz-label">Các từ bị trượt (đã đánh dấu “Cần ôn”)</div>
          {missed.map((w) => (
            <div key={w[0]} className="quiz-reveal bad">
              {w[0]} · {w[1]} · {w[2]}{' '}
              {speech.supported && (
                <button type="button" className="speak-btn mini" aria-label="Nghe từ" onClick={() => speech.speak(w[0], 'sum-' + w[0])}>
                  🔊
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="srs-note">🎉 Không trượt từ nào!</div>
      )}
      <div className="controls">
        {missed.length > 0 && (
          <button type="button" className="btn" onClick={onReplayMissed}>
            🔁 Chơi lại các từ trượt
          </button>
        )}
        <button type="button" className="btn" onClick={onReplay}>
          🔀 Chơi lại
        </button>
        <Link to="/games" className="btn secondary">
          ← Chọn game
        </Link>
      </div>
    </div>
  );
}
