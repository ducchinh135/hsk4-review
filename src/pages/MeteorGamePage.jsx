import { useEffect, useRef, useState } from 'react';
import GameSummary from '../components/GameSummary.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METEOR, fallMs, findTarget, hintMask, loadSettings, pickWords, spawnX } from '../games.js';
import { shuffle } from '../random.js';
import { Link } from '../router.jsx';
import { isMuted, setMuted, sfx, unlock } from '../sfx.js';

const HIT_MS = 700;
const LASER_MS = 260;
const HURT_MS = 450;
const SPRITE_PX = 165; // height of a meteor (rock + label)
const SHIP_NOSE_PX = 108; // from the bottom of the field up to the ship's gun, where the laser starts
const GROUND_PX = 110; // space under the dashed line for the ship
const SPARKS = 10;
const TILT_MS = 220; // how long the ship leans after sliding to a target
const MAX_TILT = 18; // degrees

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
  hurtUntil: 0,
  shipX: 0.5, // 0..1 across the field; the ship slides under the meteor it shoots
  tilt: 0,
  tiltUntil: 0,
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
  const [mute, setMute] = useState(isMuted);
  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  const tilesRef = useRef(new Map()); // meteor id -> its row of letter tiles
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
          g.hurtUntil = g.clock + HURT_MS;
          sfx.miss();
          markMissed(m.word);
          if (m.fall === 1) g.queue.push({ word: m.word, fall: 2 });
        }
      }
      g.meteors = g.meteors.filter((m) => m.state === 'fall' || g.clock < m.until);
      g.lasers = g.lasers.filter((l) => g.clock < l.until);
      if (g.lives <= 0) {
        g.over = 'lost';
        sfx.lose();
      } else if (!g.queue.length && !g.meteors.length) {
        g.over = 'won';
        sfx.win();
      }
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
  const toggleMute = () => {
    setMuted(!mute);
    setMute(!mute);
    unlock();
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
        sfx.wrong();
        setShake(true);
        setTimeout(() => setShake(false), 300);
      }
      return;
    }
    // aim at the middle of the meteor's letter tiles, in field coordinates
    const field = fieldRef.current?.getBoundingClientRect();
    const tiles = tilesRef.current.get(target.id)?.getBoundingClientRect();
    target.state = 'hit';
    target.until = s.clock + HIT_MS;
    s.hits += 1;
    const from = s.shipX;
    s.shipX = target.x;
    s.tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, (target.x - from) * (fieldRef.current?.clientWidth || 0) / 12));
    s.tiltUntil = s.clock + TILT_MS;
    if (field && tiles) {
      s.lasers.push({ id: target.id, x0: s.shipX, x: tiles.left + tiles.width / 2 - field.left, y: tiles.top + tiles.height / 2 - field.top, until: s.clock + LASER_MS });
    }
    sfx.laser();
    sfx.hit();
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
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return; // 229: Safari ends composition before the keydown
    unlock();
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
  const fallH = Math.max(0, H - GROUND_PX - SPRITE_PX);
  return (
    <div className="meteor-screen">
      <div className="meteor-top">
        <strong>☄️ Bắn thiên thạch</strong>
        <span className="meteor-lives" aria-label={`${s.lives} mạng`}>{'❤️'.repeat(s.lives) + '🤍'.repeat(METEOR.lives - s.lives)}</span>
        <span>{s.hits} / {s.total}</span>
        <span className="meteor-top-btns">
          <button type="button" onClick={toggleMute} aria-pressed={mute} title={mute ? 'Bật âm thanh' : 'Tắt âm thanh'}>{mute ? '🔇' : '🔔'}</button>
          <button type="button" onClick={togglePause}>{s.paused ? 'Chơi tiếp' : 'Tạm dừng'}</button>
          <button type="button" onClick={() => restart(pickWords(loadSettings(), getMark))}>Chơi lại</button>
          <Link to="/games">Thoát</Link>
        </span>
        <div className="meteor-progress"><div style={{ width: `${(s.hits / s.total) * 100}%` }} /></div>
      </div>
      <div className={'meteor-field' + (s.clock < s.hurtUntil ? ' hurt' : '')} ref={fieldRef} onClick={focus}>
        <div className="meteor-ground" style={{ bottom: GROUND_PX }} />
        {s.meteors.map((m) => {
          const falling = m.state === 'fall';
          const all = hintMask(m.word[1], 99);
          const shown = falling ? m.shown : all.length;
          return (
            <div key={m.id} className="meteor" style={{ transform: `translate3d(${m.x * W - 85}px, ${m.y * fallH + 10}px, 0)` }}>
              <div className={'meteor-body' + (m.state === 'hit' ? ' boom' : m.state === 'ground' ? ' crash' : '')}>
                <img className="meteor-rock" src="/img/games/meteor.svg" alt="" draggable="false" />
                <div className="meteor-label">
                  {falling ? (
                    <div className="meteor-meaning">
                      {m.word[2]}{' '}
                      {speech.supported && (
                        <button type="button" className="meteor-ear" aria-label="Nghe từ" onClick={(e) => { e.stopPropagation(); listen(m); focus(); }}>🔊</button>
                      )}
                    </div>
                  ) : (
                    <div className="meteor-meaning">{m.word[0]} · {m.word[1]}</div>
                  )}
                  <div className="meteor-tiles" ref={(el) => (el ? tilesRef.current.set(m.id, el) : tilesRef.current.delete(m.id))}>
                    {all.map((ch, i) => (
                      <span key={i} className={'tile' + (i < shown ? ' on' : '') + (!falling && m.state === 'hit' ? ' pop' : '')} style={{ '--i': i }}>
                        {i < shown ? ch : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {m.state === 'hit' && (
                <div className="meteor-sparks" aria-hidden="true">
                  {Array.from({ length: SPARKS }, (_, i) => (
                    <i key={i} style={{ '--a': `${(360 / SPARKS) * i}deg` }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <svg className="meteor-lasers" width={W} height={H} aria-hidden="true">
          {s.lasers.map((l) => (
            <g key={l.id}>
              <line className="laser-glow" x1={l.x0 * W} y1={H - SHIP_NOSE_PX} x2={l.x} y2={l.y} pathLength="1" />
              <line className="laser-core" x1={l.x0 * W} y1={H - SHIP_NOSE_PX} x2={l.x} y2={l.y} pathLength="1" />
            </g>
          ))}
        </svg>
        <div className={'meteor-ship' + (s.lasers.length ? ' fire' : '')} style={{ left: `${s.shipX * 100}%`, transform: `translateX(-50%) rotate(${s.clock < s.tiltUntil ? s.tilt : 0}deg)` }} aria-hidden="true">
          <img src="/img/games/ship.svg" alt="" draggable="false" />
        </div>
        {s.paused && <div className="meteor-pause">Tạm dừng · Enter để chơi tiếp</div>}
      </div>
      <div className="meteor-bottom">
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
        <button type="button" className="meteor-hint" onClick={() => { hint(); focus(); }}>💡 Gợi ý</button>
      </div>
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
