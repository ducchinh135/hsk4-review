import { useState } from 'react';
import { FALL_RANGE, FALL_SECONDS, validFallSec } from '../games.js';

// Preset fall times plus a custom number of seconds typed by the player.
export default function FallSpeed({ value, onChange, label, className }) {
  const preset = FALL_SECONDS.some(([v]) => v === value);
  const [custom, setCustom] = useState(!preset);
  const [text, setText] = useState(String(value));
  const [lo, hi] = FALL_RANGE;
  const bad = custom && !validFallSec(Number(text));

  const pick = (e) => {
    if (e.target.value === 'custom') {
      setCustom(true);
      setText(String(value));
      return;
    }
    setCustom(false);
    onChange(Number(e.target.value));
    e.target.blur();
  };
  const type = (e) => {
    setText(e.target.value);
    const n = Number(e.target.value);
    if (e.target.value.trim() !== '' && validFallSec(n)) onChange(n);
  };

  return (
    <div className={className}>
      <label>
        <span>{label}</span>
        <select value={custom ? 'custom' : value} onChange={pick}>
          {FALL_SECONDS.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
          <option value="custom">Tùy chỉnh…</option>
        </select>
      </label>
      {custom && (
        <label className="fall-custom">
          <input type="number" inputMode="numeric" min={lo} max={hi} step="1" value={text} onChange={type} aria-invalid={bad} />
          <span>giây{bad ? ` (từ ${lo} đến ${hi})` : ''}</span>
        </label>
      )}
    </div>
  );
}
