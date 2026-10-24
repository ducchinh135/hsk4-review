import { useEffect, useRef, useState } from 'react';
import GameSummary from '../components/GameSummary.jsx';
import { useApp } from '../context/AppContext.jsx';
import { checkTyped, finishItem, hintMask, loadSettings, newRound, pickWords } from '../games.js';
import { shuffle } from '../random.js';
import { Link } from '../router.jsx';

const TITLES = { meaning: 'Gõ từ', pinyin: 'Gõ pinyin' };
const PLACEHOLDERS = {
  meaning: 'Gõ pinyin hoặc chữ Hán',
  pinyin: 'Gõ pinyin có thanh, ví dụ fa3lv4 hoặc fǎlǜ',
};

// Typing game: see the meaning and type the Chinese word (mode "meaning"), or see the hanzi and type the pinyin with tones (mode "pinyin").
export default function TypeGamePage({ mode }) {
  const { marks, speech } = useApp();
  const { getMark, setMark } = marks;
  const [round, setRound] = useState(() => newRound(pickWords(loadSettings(), getMark)));
  const [phase, setPhase] = useState('ask'); // 'ask' | 'right' | 'retype'
  const [result, setResult] = useState(null); // the last checkTyped result
  const [typed, setTyped] = useState(''); // what was typed at the last check
  const [input, setInput] = useState('');
  const [hint, setHint] = useState(0);
  const [now, setNow] = useState(Date.now());
  const startedAt = useRef(Date.now());
  const times = useRef([]);
  const ctrlAlone = useRef(false);
  const inputRef = useRef(null);

  const item = round.queue[0];
  const word = item?.word;
  const letters = word ? hintMask(word[1], 0).length : 0;

  const reset = () => {
    setPhase('ask');
    setResult(null);
    setInput('');
    setHint(0);
    startedAt.current = Date.now();
  };
  const advance = (missed) => {
    setRound((r) => finishItem(r, missed));
    reset();
  };
  const restart = (words) => {
    speech.cancel();
    times.current = [];
    setRound(newRound(words));
    reset();
  };
  const say = () => word && speech.speak(word[0], 'type');

  useEffect(() => {
    inputRef.current?.focus();
  }, [round, phase]);

  useEffect(() => {
    if (phase !== 'ask') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase, round]);

  useEffect(() => {
    if (phase !== 'right') return undefined;
    const id = setTimeout(() => advance(hint > 0), 1000);
    return () => clearTimeout(id);
    // advance only touches state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, hint]);

  const fail = (res, given) => {
    setMark(word[0], 'r');
    setResult(res);
    setTyped(given);
    setInput('');
    setPhase('retype');
    say();
  };
  const submit = () => {
    const given = input.trim();
    if (!given) return;
    const res = checkTyped(given, word, mode);
    if (phase === 'retype') {
      if (res === 'ok') advance(true);
      return;
    }
    if (item.attempt === 1) times.current.push(Date.now() - startedAt.current);
    if (res === 'ok' || res === 'synonym') {
      setResult(res);
      setPhase('right');
      say();
    } else fail(res, given);
  };
  const giveUp = () => {
    if (phase !== 'ask') return;
    if (item.attempt === 1) times.current.push(Date.now() - startedAt.current);
    fail('wrong', '');
  };
  const showHint = () => {
    if (mode !== 'meaning' || phase !== 'ask') return;
    if (hint === 0) setMark(word[0], 'r');
    setHint((h) => Math.min(h + 1, letters));
  };

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Control') {
      if (!e.repeat) ctrlAlone.current = true;
      return;
    }
    ctrlAlone.current = false;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'right') advance(hint > 0);
      else submit();
    } else if (e.key === 'Tab' || (e.ctrlKey && e.code === 'Space')) {
      e.preventDefault();
      showHint();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      giveUp();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'Control' && ctrlAlone.current && mode === 'meaning') say();
    ctrlAlone.current = false;
  };

  if (!round.total) {
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

  if (!item) {
    const avg = times.current.length ? times.current.reduce((a, b) => a + b, 0) / times.current.length / 1000 : 0;
    return (
      <div className="panel">
        <GameSummary
          title={TITLES[mode]}
          stats={[
            ['Đúng ngay lần đầu', `${round.firstTry} / ${round.total}`],
            ['Trung bình mỗi từ', `${avg.toFixed(1)} giây`],
          ]}
          missed={round.missed}
          speech={speech}
          onReplay={() => restart(pickWords(loadSettings(), getMark))}
          onReplayMissed={() => restart(shuffle(round.missed))}
        />
      </div>
    );
  }

  const answered = phase !== 'ask';
  const state = phase === 'right' ? ' ok' : phase === 'retype' ? ' bad' : '';
  return (
    <div className="panel">
      <div className="fillblank-box type-game">
        <div className="exercise-top">
          <Link to="/games" className="btn secondary">← Chọn game</Link>
          <span className="exercise-summary">{TITLES[mode]}</span>
          <span className="exercise-summary">
            Từ {Math.min(round.done + 1, round.total)} / {round.total}
            {phase === 'ask' && ` · ${Math.max(0, Math.floor((now - startedAt.current) / 1000))} giây`}
          </span>
        </div>
        <div className="type-prompt">{mode === 'meaning' ? word[2] : word[0]}</div>
        {mode === 'meaning' && hint > 0 && phase === 'ask' && <div className="hint-mask">{hintMask(word[1], hint).join(' ')}</div>}
        <input
          ref={inputRef}
          className={'type-input' + state}
          value={input}
          readOnly={phase === 'right'}
          placeholder={phase === 'retype' ? 'Gõ lại đáp án để tiếp tục' : PLACEHOLDERS[mode]}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        {answered && (
          <div className={'quiz-reveal ' + (phase === 'right' ? 'ok' : 'bad')}>
            <div>
              {phase === 'right' ? '✅ ' : '❌ '}
              {word[0]} · {word[1]} · {word[2]}
            </div>
            {result === 'synonym' && <div className="quiz-reveal-sub">Đáp án của thẻ: {word[0]}</div>}
            {result === 'tone' && (
              <div className="quiz-reveal-sub">
                Sai thanh điệu: bạn gõ {typed}, đúng là {word[1]}
              </div>
            )}
            {phase === 'retype' && <div className="quiz-reveal-sub">{word[3]}</div>}
          </div>
        )}
        <div className="controls">
          {phase === 'ask' && (
            <>
              <button type="button" className="btn" onClick={submit}>Kiểm tra</button>
              {mode === 'meaning' && (
                <button type="button" className="btn secondary" onClick={showHint}>💡 Gợi ý</button>
              )}
              {mode === 'meaning' && speech.supported && (
                <button type="button" className="btn secondary" onClick={say}>🔊 Nghe từ</button>
              )}
              <button type="button" className="btn secondary" onClick={giveUp}>Không nhớ</button>
            </>
          )}
          {answered && speech.supported && (
            <button type="button" className="btn secondary" onClick={say}>🔊 Nghe từ</button>
          )}
        </div>
        <div className="game-keys">Enter: kiểm tra · {mode === 'meaning' ? 'Tab: gợi ý · Ctrl: nghe từ · ' : ''}Esc: không nhớ</div>
      </div>
    </div>
  );
}
