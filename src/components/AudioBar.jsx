export default function AudioBar({ speech }) {
  if (!speech.supported) return null;
  return (
    <div className="audio-bar">
      <label>
        <input type="checkbox" checked={speech.auto} onChange={(e) => speech.setAutoSpeak(e.target.checked)} /> 🔊 Tự đọc khi chuyển thẻ
      </label>
      {!speech.hasVoice && (
        <div className="audio-note">
          ⚠️ Thiết bị chưa có giọng tiếng Trung. Hãy cài giọng Chinese (Mandarin) trong cài đặt hệ thống để nghe tốt hơn.
        </div>
      )}
    </div>
  );
}
