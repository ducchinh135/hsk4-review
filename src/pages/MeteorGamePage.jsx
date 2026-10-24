import { useEffect, useRef, useState } from 'react';
import GameSummary from '../components/GameSummary.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METEOR, fallMs, findTarget, hintMask, loadSettings, pickWords, spawnX } from '../games.js';
import { shuffle } from '../random.js';
import { Link } from '../router.jsx';

const HIT_MS = 600;
const LASER_MS = 200;
const SPRITE_PX = 130; // height of a meteor (flame + label), kept below the ground line

const makeSim = (words) => ({
  queue: words.map((word) => ({ word, fall: 1 })),
  total: words.length,
  meteors: [],
  lasers: [],
  lives: METEOR.lives,
  spawned: 0,
  nextId: 0,
  lastSpawn: -Infinity,
  clock: 0, // ms of play time, frozen while paused
  hits: 0,
  missed: [],
  paused: false,
  over: null, // 'won' | 'lost'
});

const lowest = (s) => s.meteors.filter((m) => m.state === 'fall').reduce((a, m) => (!a || m.y > a.y ? m : a), null);

// Meteors with a Vietnamese meaning fall; type the word (pinyin or hanzi) and Enter to shoot it down.
function MeteorGame() {
  const { marks, speech } = useApp();
  const { getMark, setMark } = marks;
  const sim = useRef(null);
  if (!sim.current) sim.current = makeSim(pickWords(loadSettings(), getMark));
  const [, setTick] = useState(0);
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  const ctrlAlone = useRef(false);
  const s = sim.current;

  const markMissed = (word) => {
    const g = sim.current; // not `s`: the game loop keeps the first render's closure, and a restart swaps the round
    if (g.missed.includes(word)) return;
    g.missed.push(word);
    setMark(word[0], 'r');
  };

  useEffect(() => {
    let last = performance.now();
    let raf;
    const frame = (t) => {
      const dt = Math.min(100, t - last);
      last = t;
      const g = sim.current;
      if (!g.paused && !g.over) step(g, dt);
      setTick((n) => n + 1);
      raf = requestAnimationFrame(frame);
    };
    const step = (g, dt) => {
      g.clock += dt;
      const falling = g.meteors.filter((m) => m.state === 'fall').length;
      if (g.queue.length && falling < METEOR.maxOnScreen && g.clock - g.lastSpawn >= METEOR.spawnGapMs) {
        const item = g.queue.shift();
        g.meteors.push({ id: g.nextId++, word: item.word, fall: item.fall, x: spawnX(g.meteors, Math.random), y: 0, ms: fallMs(g.spawned++), state: 'fall', until: 0, shown: 1, hinted: false });
        g.lastSpawn = g.clock;
      }
      for (const m of g.meteors) {
        if (m.state !== 'fall') continue;
        m.y += dt / m.ms;
        if (m.y >= 1) {
          m.y = 1;
          m.state = 'ground';
          m.until = g.clock + METEOR.groundRevealMs;
          g.lives -= 1;
          markMissed(m.word);
          if (m.fall === 1) g.queue.push({ word: m.word, fall: 2 });
        }
      }
      g.meteors = g.meteors.filter((m) => m.state === 'fall' || g.clock < m.until);
      g.lasers = g.lasers.filter((l) => g.clock < l.until);
      if (g.lives <= 0) g.over = 'lost';
      else if (!g.queue.length && !g.meteors.length) g.over = 'won';
    };
    const onHide = () => {
      if (document.hidden) sim.current.paused = true;
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onHide);
    };
    // the loop only reads refs; markMissed uses stable setMark
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = () => inputRef.current?.focus();
  const restart = (words) => {
    speech.cancel();
    sim.current = makeSim(words);
    setInput('');
    focus();
  };
  const togglePause = () => {
    if (s.over) return;
    s.paused = !s.paused;
    focus();
  };
  const fire = () => {
    if (s.paused) {
      s.paused = false;
      return;
    }
    const target = findTarget(input, s.meteors);
    if (!target) {
      if (input.trim()) {
        setShake(true);
        setTimeout(() => setShake(false), 300);
      }
      return;
    }
    target.state = 'hit';
    target.until = s.clock + HIT_MS;
    s.hits += 1;
    s.lasers.push({ id: target.id, x: target.x, y: target.y, until: s.clock + LASER_MS });
    speech.speak(target.word[0], 'meteor');
    setInput('');
  };
  const hint = () => {
    const m = lowest(s);
    if (!m || s.paused) return;
    m.shown = Math.min(m.shown + 1, hintMask(m.word[1], 0).length);
    if (!m.hinted) {
      m.hinted = true;
      markMissed(m.word);
    }
  };
  const listen = (m = lowest(s)) => m && speech.speak(m.word[0], 'meteor');

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Control') {
      if (!e.repeat) ctrlAlone.current = true;
      return;
    }
    ctrlAlone.current = false;
    if (e.key === 'Enter') {
      e.preventDefault();
      fire();
    } else if (e.key === 'Tab' || (e.ctrlKey && e.code === 'Space')) {
      e.preventDefault();
      hint();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'Control' && ctrlAlone.current) listen();
    ctrlAlone.current = false;
  };

  if (!s.total) {
    return (
      <div className="panel">
        <div className="fillblank-box quiz-done">
          <div className="filter-note">Không có từ phù hợp.</div>
          <div className="controls">
            <Link to="/games" className="btn secondary">← Chọn game</Link>
          </div>
        </div>
      </div>
    );
  }

  if (s.over) {
    return (
      <div className="panel">
        <GameSummary
          title={s.over === 'lost' ? 'Hết mạng!' : 'Hoàn thành!'}
          stats={[
            ['Bắn hạ', `${s.hits} / ${s.total}`],
            ['Còn lại', `${s.lives} ❤️`],
          ]}
          missed={s.missed}
          speech={speech}
          onReplay={() => restart(pickWords(loadSettings(), getMark))}
          onReplayMissed={() => restart(shuffle(s.missed))}
        />
      </div>
    );
  }

  const W = fieldRef.current?.clientWidth || 0;
  const H = fieldRef.current?.clientHeight || 0;
  const py = (y) => y * (H - SPRITE_PX) + 40;
  return (
    <div className="panel">
      <div className="meteor-bar">
        <strong>☄️ Bắn thiên thạch</strong>
        <span aria-label={`${s.lives} mạng`}>{'❤️'.repeat(s.lives) + '🤍'.repeat(METEOR.lives - s.lives)}</span>
        <span>{s.hits} / {s.total}</span>
        <span className="meteor-bar-btns">
          <button type="button" className="btn secondary" onClick={togglePause}>{s.paused ? 'Chơi tiếp' : 'Tạm dừng'}</button>
          <button type="button" className="btn secondary" onClick={() => restart(pickWords(loadSettings(), getMark))}>Chơi lại</button>
          <Link to="/games" className="btn secondary">Thoát</Link>
        </span>
      </div>
      <div className="meteor-field" ref={fieldRef} onClick={focus}>
        {s.meteors.map((m) => {
          const shown = m.state === 'fall';
          return (
            <div key={m.id} className={'meteor' + (m.state === 'hit' ? ' boom' : '')} style={{ left: `${m.x * 100}%`, top: `calc(${m.y} * (100% - ${SPRITE_PX}px) + 40px)` }}>
              <div className="meteor-rock">☄️</div>
              <div className="meteor-label">
                {shown ? (
                  <>
                    <div className="meteor-meaning">
                      {m.word[2]}{' '}
                      {speech.supported && (
                        <button type="button" className="meteor-ear" aria-label="Nghe từ" onClick={(e) => { e.stopPropagation(); listen(m); }}>🔊</button>
                      )}
                    </div>
                    <div className="meteor-mask">{hintMask(m.word[1], m.shown).join(' ')}</div>
                  </>
                ) : (
                  <>
                    <div className="meteor-meaning">{m.word[0]}</div>
                    <div className="meteor-mask">{m.word[1]}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <svg className="meteor-lasers" width={W} height={H} aria-hidden="true">
          {s.lasers.map((l) => (
            <line key={l.id} x1={W / 2} y1={H - 40} x2={l.x * W} y2={py(l.y) + 30} stroke="#ffe066" strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
        <div className="meteor-ship" aria-hidden="true">🚀</div>
        {s.paused && <div className="meteor-pause">Tạm dừng · Enter để chơi tiếp</div>}
      </div>
      <input
        ref={inputRef}
        className={'type-input meteor-input' + (shake ? ' shake' : '')}
        value={input}
        autoFocus
        autoCapitalize="none"
        autoComplete="off"
        spellCheck="false"
        placeholder="Gõ pinyin hoặc chữ Hán · Enter: bắn · Tab: gợi ý · Ctrl: nghe từ"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
    </div>
  );
}

// The game needs a keyboard, so a narrow screen only gets a notice.
export default function MeteorGamePage() {
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
  if (!narrow) return <MeteorGame />;
  return (
    <div className="panel">
      <div className="fillblank-box quiz-done">
        <div className="filter-note">Nên chơi bằng bàn phím máy tính.</div>
        <div className="controls">
          <Link to="/games" className="btn secondary">← Chọn game</Link>
        </div>
      </div>
    </div>
  );
}
