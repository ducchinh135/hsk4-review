// Sound effects for the games, made with the Web Audio API so no audio files are needed.
// Browser only; every call is a no-op when muted or when Web Audio is unavailable.
const KEY = 'hsk4_games_sfx';
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem(KEY) === 'off';
} catch {
  /* storage unavailable */
}

export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? 'off' : 'on');
  } catch {
    /* storage unavailable */
  }
}

function audio() {
  if (muted) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Call from a key press or click so the browser lets the sound start.
export const unlock = () => void audio();

function tone({ type = 'sine', from, to = from, dur, gain = 0.12, delay = 0 }) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur, gain = 0.1, delay = 0 }) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  laser() {
    tone({ type: 'sawtooth', from: 1500, to: 260, dur: 0.16, gain: 0.07 });
  },
  hit() {
    noise({ dur: 0.22, gain: 0.12, delay: 0.08 });
    tone({ from: 660, to: 660, dur: 0.14, gain: 0.1, delay: 0.1 });
    tone({ from: 990, to: 990, dur: 0.22, gain: 0.1, delay: 0.2 });
  },
  miss() {
    noise({ dur: 0.35, gain: 0.16 });
    tone({ type: 'square', from: 190, to: 50, dur: 0.4, gain: 0.1 });
  },
  wrong() {
    tone({ type: 'triangle', from: 170, to: 130, dur: 0.12, gain: 0.08 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ from: f, dur: 0.22, gain: 0.1, delay: i * 0.12 }));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, gain: 0.12, delay: i * 0.18 }));
  },
};
