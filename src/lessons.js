import VOCAB from './data/vocab.json';

export { VOCAB };

// Each word is [hanzi, pinyin, meaning, example (zh), example (vi)].
export const LESSON_ORDER = Object.keys(VOCAB);
export const LESSON_LABELS = Object.fromEntries(LESSON_ORDER.map((l) => [l, 'Bài ' + l.slice(1)]));

// Every word once, in lesson order.
const seen = new Set();
export const ALL_WORDS = LESSON_ORDER.flatMap((l) => VOCAB[l].words).filter((w) => !seen.has(w[0]) && seen.add(w[0]));
export const ALL_HANZI = ALL_WORDS.map((w) => w[0]);
export const WORD_BY_HANZI = Object.fromEntries(ALL_WORDS.map((w) => [w[0], w]));

const PALETTE = [
  { a: '#ff5e78', b: '#ff8fa3', bg: '#fff0f3' }, // Bài 1: San hô đỏ / Hồng đào
  { a: '#3d8bff', b: '#7db2ff', bg: '#eef5ff' }, // Bài 2: Xanh da trời
  { a: '#12b886', b: '#63e6be', bg: '#eafff6' }, // Bài 3: Xanh bạc hà
  { a: '#ff922b', b: '#ffc078', bg: '#fff4e6' }, // Bài 4: Cam tươi
  { a: '#7950f2', b: '#a98bff', bg: '#f3eeff' }, // Bài 5: Tím nho
  { a: '#e03131', b: '#ff8787', bg: '#ffe3e3' }, // Bài 6: Đỏ tươi ruby
  { a: '#00a8cc', b: '#48dbfb', bg: '#e6f9ff' }, // Bài 7: Xanh ngọc biển
  { a: '#2b8a3e', b: '#51cf66', bg: '#ebfbee' }, // Bài 8: Xanh ngọc lục bảo
  { a: '#ca8a04', b: '#facc15', bg: '#fefce8' }, // Bài 9: Vàng hướng dương
  { a: '#4c6ef5', b: '#748ffc', bg: '#edf2ff' }, // Bài 10: Xanh chàm đậm
  { a: '#d6336c', b: '#f783ac', bg: '#fff0f6' }, // Bài 11: Hồng cánh sen
  { a: '#08979c', b: '#36cfc9', bg: '#e6fffb' }, // Bài 12: Xanh mòng két
  { a: '#d9480f', b: '#ff922b', bg: '#fff4e6' }, // Bài 13: Cam đất nung
  { a: '#1864ab', b: '#4dabf7', bg: '#e7f5ff' }, // Bài 14: Xanh hoàng gia
  { a: '#5c940d', b: '#94d82d', bg: '#f4fce3' }, // Bài 15: Xanh chanh tươi
  { a: '#ae3ec9', b: '#da77f2', bg: '#f8f0fc' }, // Bài 16: Tím hoa phong lan
  { a: '#862e9c', b: '#cc5de8', bg: '#f8f0fc' }, // Bài 17: Mận sẫm
  { a: '#137547', b: '#2a9d8f', bg: '#e8f5e9' }, // Bài 18: Xanh thông thẫm
  { a: '#b45309', b: '#f59e0b', bg: '#fffbeb' }, // Bài 19: Vàng đồng hổ phách
  { a: '#9f1239', b: '#f43f5e', bg: '#fff1f2' }, // Bài 20: Đỏ rượu vang
];

function fallbackColor(i) {
  const h = Math.round((i * 137.508) % 360);
  return {
    a: `hsl(${h}, 75%, 45%)`,
    b: `hsl(${h}, 85%, 68%)`,
    bg: `hsl(${h}, 85%, 96%)`,
  };
}

export const LESSON_COLORS = Object.fromEntries(
  LESSON_ORDER.map((l, i) => [l, PALETTE[i] || fallbackColor(i)])
);

export { range, shuffle } from './random.js';
