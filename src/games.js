// Pure logic of the reflex games (no DOM or React, so Node tests can use it).
// A word is [hanzi, pinyin, meaning, example zh, example vi].
import { ALL_WORDS, LESSON_ORDER, VOCAB } from './lessons.js';
import { checkPinyin, pinyinKey } from './quiz.js';
import { shuffle } from './random.js';

export const GAMES = [
  {
    id: 'type',
    icon: '⌨️',
    name: 'Gõ từ',
    desc: 'Nhìn nghĩa gõ từ tiếng Trung, hoặc nhìn chữ Hán gõ pinyin',
    modes: [
      { id: 'meaning', name: 'Gõ từ', desc: 'Nhìn nghĩa và gõ từ tiếng Trung', path: '/games/type/meaning' },
      { id: 'pinyin', name: 'Gõ pinyin', desc: 'Nhìn chữ Hán và gõ pinyin', path: '/games/type/pinyin' },
    ],
  },
  {
    id: 'meteor',
    icon: '☄️',
    name: 'Bắn thiên thạch',
    desc: 'Thiên thạch mang nghĩa tiếng Việt rơi xuống, gõ từ để bắn hạ',
    path: '/games/meteor',
  },
];

export const FILTERS = [
  ['all', 'Tất cả'],
  ['new', 'Chưa đánh dấu'],
  ['r', '🔁 Cần ôn'],
  ['k', '✅ Đã thuộc'],
];
export const ORDERS = [
  ['random', 'Ngẫu nhiên'],
  ['lesson', 'Theo thứ tự'],
];
export const COUNTS = [10, 20, 50, 100, 'all'];

export const DEFAULT_SETTINGS = { lesson: 'all', filter: 'all', order: 'random', count: 20 };
const SETTINGS_KEY = 'hsk4_games_v1';

// Keeps every valid field of a stored value and resets the others to their default.
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_SETTINGS;
  return {
    lesson: r.lesson === 'all' || LESSON_ORDER.includes(r.lesson) ? r.lesson : d.lesson,
    filter: FILTERS.some(([f]) => f === r.filter) ? r.filter : d.filter,
    order: ORDERS.some(([o]) => o === r.order) ? r.order : d.order,
    count: COUNTS.includes(r.count) ? r.count : d.count,
  };
}

export function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

// Every word of the chosen lesson(s) that passes the mark filter, in lesson order.
export function poolFor(settings, getMark) {
  const words = settings.lesson === 'all' ? ALL_WORDS : VOCAB[settings.lesson].words;
  return words.filter((w) => {
    const m = getMark(w[0]);
    return settings.filter === 'all' || (settings.filter === 'new' ? m === '' : m === settings.filter);
  });
}

export function pickWords(settings, getMark, rng = Math.random) {
  const pool = poolFor(settings, getMark);
  const list = settings.order === 'random' ? shuffle(pool, rng) : pool;
  return settings.count === 'all' ? list : list.slice(0, settings.count);
}

// Words that share exactly the same meaning text (e.g. 到底 / 究竟).
const BY_MEANING = new Map();
for (const w of ALL_WORDS) BY_MEANING.set(w[2], [...(BY_MEANING.get(w[2]) || []), w]);

const matches = (input, w) => input === w[0] || pinyinKey(input).letters === pinyinKey(w[1]).letters;

// 'ok' | 'synonym' | 'tone' | 'wrong'. `meaning` mode ignores tones and also takes hanzi; `pinyin` mode needs the tones.
export function checkTyped(input, word, mode) {
  const s = String(input).trim();
  if (!s) return 'wrong';
  if (mode === 'pinyin') return checkPinyin(s, word[1]);
  if (matches(s, word)) return 'ok';
  const twins = (BY_MEANING.get(word[2]) || []).filter((w) => w !== word);
  return twins.some((w) => matches(s, w)) ? 'synonym' : 'wrong';
}

// The pinyin letters (no tones), the first `shown` of them revealed and the rest '_'.
export function hintMask(pinyin, shown) {
  return [...pinyinKey(pinyin).letters].map((ch, i) => (i < shown ? ch : '_'));
}

// One tile per pinyin letter, tones dropped ('ü' for lü, nü).
export const tileLetters = (pinyin) => [...pinyinKey(pinyin).letters];

// A pressed letter fills a tile when it is that letter; v (or u) fills ü.
export const keyMatchesTile = (key, tile) => key === tile || (tile === 'ü' && (key === 'v' || key === 'u'));

// Tiles given for free when a meteor appears: the first letter, but never the whole word.
export const initialShown = (pinyin) => Math.min(1, tileLetters(pinyin).length - 1);

export const REQUEUE_GAP = 3;
export const MAX_ATTEMPTS = 3;

// A round: queue of { word, attempt }, `total` distinct words, `done` finished ones, `firstTry` right on the first ask.
export const newRound = (words) => ({
  queue: words.map((word) => ({ word, attempt: 1 })),
  total: words.length,
  done: 0,
  firstTry: 0,
  missed: [],
});

// Takes the first item off the queue. A miss puts it back REQUEUE_GAP places later until MAX_ATTEMPTS.
export function finishItem(round, missed) {
  const [item, ...rest] = round.queue;
  const next = { ...round, queue: rest };
  if (missed && !round.missed.includes(item.word)) next.missed = [...round.missed, item.word];
  if (missed && item.attempt < MAX_ATTEMPTS) {
    const at = Math.min(REQUEUE_GAP, rest.length);
    next.queue = [...rest.slice(0, at), { word: item.word, attempt: item.attempt + 1 }, ...rest.slice(at)];
    return next;
  }
  next.done = round.done + 1;
  if (!missed && item.attempt === 1) next.firstTry = round.firstTry + 1;
  return next;
}

export const METEOR = { lives: 5, maxOnScreen: 2, firstFallMs: 20000, speedup: 0.02, minFallMs: 10000, spawnGapMs: 5000, groundRevealMs: 2000 };

export const fallMs = (index) => Math.max(METEOR.minFallMs, METEOR.firstFallMs * (1 - METEOR.speedup) ** index);

// A horizontal position in 0.1..0.9 that keeps clear of meteors still near the top.
export function spawnX(meteors, rng = Math.random) {
  const near = meteors.filter((m) => m.state === 'fall' && m.y < 0.35);
  let x = 0.5;
  for (let i = 0; i < 20; i++) {
    x = 0.1 + rng() * 0.8;
    if (near.every((m) => Math.abs(m.x - x) >= 0.22)) return x;
  }
  return x;
}
