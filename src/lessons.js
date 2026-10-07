import VOCAB from './data/vocab.json';

export { VOCAB };

// Each word is [hanzi, pinyin, meaning, example (zh), example (vi)].
export const LESSON_ORDER = Object.keys(VOCAB);
export const LESSON_LABELS = Object.fromEntries(LESSON_ORDER.map((l) => [l, 'Bài ' + l.slice(1)]));

const PALETTE = [
  { a: '#ff5e78', b: '#ff8fa3', bg: '#fff0f3' },
  { a: '#3d8bff', b: '#7db2ff', bg: '#eef5ff' },
  { a: '#12b886', b: '#63e6be', bg: '#eafff6' },
  { a: '#ff9800', b: '#ffc266', bg: '#fff7e8' },
  { a: '#7950f2', b: '#a98bff', bg: '#f3eeff' },
];
export const LESSON_COLORS = Object.fromEntries(LESSON_ORDER.map((l, i) => [l, PALETTE[i % PALETTE.length]]));

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const range = (n) => [...Array(n).keys()];
