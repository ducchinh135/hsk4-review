import VOCAB from './data/vocab.json';

export { VOCAB };

// Each word is [hanzi, pinyin, meaning, example (zh), example (vi)].
export const LESSON_ORDER = Object.keys(VOCAB);
export const LESSON_LABELS = Object.fromEntries(LESSON_ORDER.map((l) => [l, 'Bài ' + l.slice(1)]));

// Every word once, in lesson order (the daily review introduces new words in this order).
const seen = new Set();
export const ALL_WORDS = LESSON_ORDER.flatMap((l) => VOCAB[l].words).filter((w) => !seen.has(w[0]) && seen.add(w[0]));
export const ALL_HANZI = ALL_WORDS.map((w) => w[0]);
export const WORD_BY_HANZI = Object.fromEntries(ALL_WORDS.map((w) => [w[0], w]));

const PALETTE = [
  { a: '#ff5e78', b: '#ff8fa3', bg: '#fff0f3' },
  { a: '#3d8bff', b: '#7db2ff', bg: '#eef5ff' },
  { a: '#12b886', b: '#63e6be', bg: '#eafff6' },
  { a: '#ff9800', b: '#ffc266', bg: '#fff7e8' },
  { a: '#7950f2', b: '#a98bff', bg: '#f3eeff' },
];
export const LESSON_COLORS = Object.fromEntries(LESSON_ORDER.map((l, i) => [l, PALETTE[i % PALETTE.length]]));

export { range, shuffle } from './random.js';
