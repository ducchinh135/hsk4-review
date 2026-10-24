import { useEffect, useRef, useState } from 'react';
import GameSummary from '../components/GameSummary.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METEOR, fallMs, keyMatchesTile, loadSettings, pickWords, spawnX, tileLetters } from '../games.js';
import { shuffle } from '../random.js';
import { Link } from '../router.jsx';
import { isMuted, setMuted, sfx, unlock } from '../sfx.js';

const HIT_MS = 700;
const LASER_MS = 220;
const ERR_MS = 250;
const HURT_MS = 450;
const SPRITE_PX = 165; // height of a meteor (rock + label)
const SHIP_PIVOT_PX = 33; // from the bottom of the field up to the point the ship turns around
const SHIP_NOSE_LEN = 75; // from that point to the gun at the ship's nose, where the laser starts
const GROUND_PX = 110; // space under the dashed line for the ship
const SPARKS = 10;
const TILT_MS = 450; // how long the ship stays turned toward the meteor it shot
const MAX_TILT = 75; // degrees from upright

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
  tilt: 0, // degrees; the ship stays in the middle and turns toward the tile it shoots
  tiltUntil: 0,
  nextLaser: 0,
  lockId: null, // the meteor being typed; the keys keep going to it until it is down
  hits: 0,
  missed: [],
  paused: false,
  over: null, // 'won' | 'lost'
});

const lowest = (s) => s.meteors.filter((m) => m.state === 'fall').reduce((a, m) => (!a || m.y > a.y ? m : a), null);
// The meteor the typed letters go to: the one already being typed, else the nearest to the ground.
const targetOf = (s) => s.meteors.find((m) => m.id === s.lockId && m.state === 'fall') || lowest(s);

// Meteors with a Vietnamese meaning fall. Each pinyin letter pressed that matches the next empty tile of the nearest meteor
// fires a laser at that tile; when the last tile is filled the meteor is down.
function MeteorGame() {
  const { marks, speech } = useApp();
  const { getMark, setMark } = marks;
  const sim = useRef(null);
  if (!sim.current) sim.current = makeSim(pickWords(loadSettings(), getMark));
  const [, setTick] = useState(0);
  const [mute, setMute] = useState(isMuted);
  const act = useRef({}); // the latest handlers, for the window key listeners
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
        g.meteors.push({ id: g.nextId++, word: item.word, fall: item.fall, x: spawnX(g.meteors, Math.random), y: 0, ms: fallMs(g.spawned++), state: 'fall', until: 0, shown: 0, typed: [], errUntil: 0, hinted: false });
        g.lastSpawn = g.clock;
      }
      for (const m of g.meteors) {
        if (m.state !== 'fall') continue;
        m.y += dt / m.ms;
        if (m.y >= 1) {
          m.y = 1;
          m.state = 'ground';
          if (g.lockId === m.id) g.lockId = null;
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

  const restart = (words) => {
    speech.cancel();
    sim.current = makeSim(words);
  };
  const togglePause = () => {
    if (s.over) return;
    s.paused = !s.paused;
  };
  const toggleMute = () => {
    setMuted(!mute);
    setMute(!mute);
    unlock();
  };
  // Fires a laser from the ship's nose at tile `idx` of meteor `m`, turning the ship toward it.
  const aim = (m, idx) => {
    const g = sim.current;
    const field = fieldRef.current?.getBoundingClientRect();
    const tile = tilesRef.current.get(m.id)?.children[idx]?.getBoundingClientRect();
    if (!field || !tile) return;
    const tx = tile.left + tile.width / 2 - field.left;
    const ty = tile.top + tile.height / 2 - field.top;
    const px = field.width / 2;
    const py = field.height - SHIP_PIVOT_PX;
    const deg = Math.max(-MAX_TILT, Math.min(MAX_TILT, (Math.atan2(tx - px, py - ty) * 180) / Math.PI));
    const rad = (deg * Math.PI) / 180;
    g.tilt = deg;
    g.tiltUntil = g.clock + TILT_MS;
    g.lasers.push({ id: g.nextLaser++, x0: px + SHIP_NOSE_LEN * Math.sin(rad), y0: py - SHIP_NOSE_LEN * Math.cos(rad), x: tx, y: ty, until: g.clock + LASER_MS });
  };
  const bringDown = (m) => {
    const g = sim.current;
    m.state = 'hit';
    m.until = g.clock + HIT_MS;
    g.hits += 1;
    g.lockId = null;
    sfx.hit();
    speech.speak(m.word[0], 'meteor');
  };
  const pressLetter = (letter) => {
    const g = sim.current;
    if (g.paused || g.over) return;
    const m = targetOf(g);
    if (!m) return;
    const tiles = tileLetters(m.word[1]);
    if (!keyMatchesTile(letter, tiles[m.shown])) {
      sfx.wrong();
      m.errUntil = g.clock + ERR_MS;
      return;
    }
    g.lockId = m.id;
    aim(m, m.shown);
    sfx.laser();
    m.typed.push(m.shown);
    m.shown += 1;
    if (m.shown >= tiles.length) bringDown(m);
  };
  // Reveals the next letter of the target without a laser; the word then counts as missed.
  const hint = () => {
    const g = sim.current;
    const m = targetOf(g);
    if (!m || g.paused) return;
    if (!m.hinted) {
      m.hinted = true;
      markMissed(m.word);
    }
    g.lockId = m.id;
    m.shown += 1;
    if (m.shown >= tileLetters(m.word[1]).length) bringDown(m);
  };
  const listen = (m = targetOf(sim.current)) => m && speech.speak(m.word[0], 'meteor');
  act.current = { pressLetter, hint, togglePause, listen };

  useEffect(() => {
    let ctrlAlone = false;
    const onKeyDown = (e) => {
      const a = act.current;
      unlock();
      if (e.key === 'Control') {
        if (!e.repeat) ctrlAlone = true;
        return;
      }
      ctrlAlone = false;
      if (e.metaKey || e.altKey) return;
      if (e.ctrlKey) {
        if (e.code === 'Space') {
          e.preventDefault();
          a.hint();
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        a.hint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        a.togglePause();
      } else if (e.key === 'Enter') {
        if (sim.current.paused) {
          e.preventDefault();
          a.togglePause();
        }
      } else if (/^Key[A-Z]$/.test(e.code) && !e.repeat) {
        e.preventDefault();
        a.pressLetter(e.code.slice(3).toLowerCase());
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Control' && ctrlAlone) act.current.listen();
      ctrlAlone = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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
  const current = targetOf(s);
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
      <div className={'meteor-field' + (s.clock < s.hurtUntil ? ' hurt' : '')} ref={fieldRef}>
        <div className="meteor-ground" style={{ bottom: GROUND_PX }} />
        {s.meteors.map((m) => {
          const falling = m.state === 'fall';
          const all = tileLetters(m.word[1]);
          const shown = falling ? m.shown : all.length;
          return (
            <div key={m.id} className={'meteor' + (m === current ? ' target' : '')} style={{ transform: `translate3d(${m.x * W - 85}px, ${m.y * fallH + 10}px, 0)` }}>
              <div className={'meteor-body' + (m.state === 'hit' ? ' boom' : m.state === 'ground' ? ' crash' : '')}>
                <img className="meteor-rock" src="/img/games/meteor.svg" alt="" draggable="false" />
                <div className="meteor-label">
                  {falling ? (
                    <div className="meteor-meaning">
                      {m.word[2]}{' '}
                      {speech.supported && (
                        <button type="button" className="meteor-ear" aria-label="Nghe từ" onClick={(e) => { e.stopPropagation(); listen(m); }}>🔊</button>
                      )}
                    </div>
                  ) : (
                    <div className="meteor-meaning">{m.word[0]} · {m.word[1]}</div>
                  )}
                  <div className={'meteor-tiles' + (s.clock < m.errUntil ? ' err' : '')} ref={(el) => (el ? tilesRef.current.set(m.id, el) : tilesRef.current.delete(m.id))}>
                    {all.map((ch, i) => (
                      <span key={i} className={'tile' + (i < shown ? ' on' : '') + (m.typed.includes(i) ? ' typed' : '') + (m === current && i === shown ? ' next' : '')}>
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
              <line className="laser-glow" x1={l.x0} y1={l.y0} x2={l.x} y2={l.y} pathLength="1" />
              <line className="laser-core" x1={l.x0} y1={l.y0} x2={l.x} y2={l.y} pathLength="1" />
            </g>
          ))}
        </svg>
        <div className={'meteor-ship' + (s.lasers.length ? ' fire' : '')} style={{ transform: `translateX(-50%) rotate(${s.clock < s.tiltUntil ? s.tilt : 0}deg)` }} aria-hidden="true">
          <img src="/img/games/ship.svg" alt="" draggable="false" />
        </div>
        {s.paused && <div className="meteor-pause">Tạm dừng · Enter để chơi tiếp</div>}
      </div>
      <div className="meteor-bottom">
        <span className="meteor-keys">Gõ chữ cái pinyin để bắn từng ô (ü gõ v) · Tab: gợi ý · Ctrl: nghe từ · Esc: tạm dừng</span>
        <button type="button" className="meteor-hint" onClick={() => hint()}>💡 Gợi ý</button>
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
