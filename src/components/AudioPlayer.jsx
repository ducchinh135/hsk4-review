import { useEffect, useRef, useState } from 'react';
import { RATES, loadRate, saveRate } from '../listening.js';

const mmss = (s) => {
  const t = Math.floor(Number.isFinite(s) ? s : 0);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
};

// One listening clip: play/pause, progress, replay and a playback-speed button (remembered). Remount
// (via `key`) per question: unmounting pauses the clip. Autoplay can be blocked by the browser; the
// play button then just waits for a click.
export default function AudioPlayer({ src, autoPlay }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(loadRate);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (autoPlay) a.play().catch(() => {});
    return () => a.pause();
    // play once when the question appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const replay = () => {
    const a = ref.current;
    a.currentTime = 0;
    a.play().catch(() => {});
  };
  const nextRate = () => {
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    saveRate(r);
    setRate(r);
    ref.current.playbackRate = r;
  };

  return (
    <div className="lp-audio">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = rate;
          setDuration(e.currentTarget.duration);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <div className="filter-note">⚠️ Không tải được audio</div>
      ) : (
        <>
          <button type="button" className="btn" onClick={toggle} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
            {playing ? '⏸' : '▶'}
          </button>
          <div className="lp-track" aria-hidden="true">
            <i style={{ width: duration ? Math.min(100, (time / duration) * 100) + '%' : '0%' }} />
          </div>
          <span className="lp-time">
            {mmss(time)} / {mmss(duration)}
          </span>
          <button type="button" className="btn secondary" onClick={replay}>
            🔁 Nghe lại
          </button>
          <button type="button" className="btn secondary" onClick={nextRate} aria-label="Tốc độ phát">
            ⚙ {rate}×
          </button>
        </>
      )}
    </div>
  );
}
