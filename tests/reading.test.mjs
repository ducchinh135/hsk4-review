// Unit tests for the reading logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAW from '../src/data/reading.json' with { type: 'json' };
import { typeCount, unitsOf, validateReading } from '../src/reading.js';

const WORDS = [
  ['堵车', 'dǔchē', 'tắc đường'],
  ['按时', 'ànshí', 'đúng giờ'],
  ['估计', 'gūjì', 'ước chừng'],
  ['坚持', 'jiānchí', 'kiên trì'],
  ['温度', 'wēndù', 'nhiệt độ'],
  ['支持', 'zhīchí', 'ủng hộ'],
].map(([text, pinyin, vi]) => ({ text, pinyin, vi }));

const ANSWERS = [3, 0, 5, 1, 4];

const sentenceItem = (answer) => ({
  text: '他每天都___锻炼身体。',
  pinyin: 'Tā měitiān dōu jiānchí duànliàn shēntǐ.',
  vi: 'Ngày nào anh ấy cũng kiên trì tập thể dục.',
  answer,
  explain: 'Sau phó từ cần động từ.',
});

const dialogueItem = (answer) => ({
  text: 'A：你怎么才来？\nB：路上___得厉害。',
  pinyin: 'A: Nǐ zěnme cái lái?\nB: Lùshang dǔchē de lìhai.',
  vi: 'A: Sao giờ cậu mới đến?\nB: Trên đường tắc kinh khủng.',
  answer,
  explain: '堵车 = tắc đường.',
});

// A valid set; `over` replaces top-level fields.
const fillSet = (id, type = 'sentence', over = {}) => ({
  id,
  type,
  words: WORDS.map((w) => ({ ...w })),
  example: { text: '我___他今天不会来了。', answer: 2 },
  items: ANSWERS.map((a) => (type === 'dialogue' ? dialogueItem(a) : sentenceItem(a))),
  ...over,
});

const dataWith = (sets, partOver = {}) => ({
  parts: [
    {
      id: 'p1',
      format: 'fill',
      name: '选词填空',
      label: 'Chọn từ điền vào chỗ trống',
      desc: 'x',
      tips: { intro: '', sections: [] },
      types: [
        { id: 'sentence', icon: '✏️', name: 'Câu đơn', desc: 'x', tip: '' },
        { id: 'dialogue', icon: '💬', name: 'Hội thoại', desc: 'x', tip: '' },
      ],
      sets,
      ...partOver,
    },
  ],
});

const errorFor = (data, id) => validateReading(data).some((e) => e.includes(id));
// A valid set with one item changed.
const withItem = (k, over, type = 'sentence') => {
  const s = fillSet('p1-001', type);
  s.items[k] = { ...s.items[k], ...over };
  return s;
};

test('the shipped reading.json is valid', () => {
  assert.deepEqual(validateReading(RAW), []);
});

test('validateReading() accepts valid sentence and dialogue sets', () => {
  assert.deepEqual(validateReading(dataWith([fillSet('p1-001'), fillSet('p1-002', 'dialogue')])), []);
});

test('validateReading() reports a malformed id', () => {
  assert.ok(errorFor(dataWith([fillSet('p1-7')]), 'p1-7'));
});

test('validateReading() reports a duplicate id', () => {
  const e = validateReading(dataWith([fillSet('p1-001'), fillSet('p1-001', 'dialogue')]));
  assert.ok(e.some((m) => m.includes('p1-001') && m.includes('trùng')));
});

test('validateReading() reports a type that is not in types', () => {
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'nope')]), 'p1-001'));
});

test('validateReading() reports a format it does not know', () => {
  assert.ok(validateReading(dataWith([], { format: 'xyz' })).some((e) => e.includes('p1') && e.includes('format')));
});

test('validateReading() reports 5 or 7 words', () => {
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'sentence', { words: WORDS.slice(0, 5) })]), 'p1-001'));
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'sentence', { words: [...WORDS, { text: '春节', pinyin: 'Chūnjié', vi: 'Tết' }] })]), 'p1-001'));
});

test('validateReading() reports two words with the same text', () => {
  const words = WORDS.map((w) => ({ ...w }));
  words[5] = { ...words[0] };
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'sentence', { words })]), 'p1-001'));
});

test('validateReading() reports a word without pinyin', () => {
  const words = WORDS.map((w) => ({ ...w }));
  words[1] = { ...words[1], pinyin: '' };
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'sentence', { words })]), 'p1-001'));
});

test('validateReading() reports 4 items', () => {
  const s = fillSet('p1-001');
  assert.ok(errorFor(dataWith([{ ...s, items: s.items.slice(0, 4) }]), 'p1-001'));
});

test('validateReading() reports an item without exactly one blank', () => {
  assert.ok(errorFor(dataWith([withItem(0, { text: '他每天都锻炼身体。' })]), 'p1-001'));
  assert.ok(errorFor(dataWith([withItem(0, { text: '他___每天都___锻炼。' })]), 'p1-001'));
});

test('validateReading() reports an example without a blank', () => {
  assert.ok(errorFor(dataWith([fillSet('p1-001', 'sentence', { example: { text: '我估计他不来。', answer: 2 } })]), 'p1-001'));
});

test('validateReading() reports an answer out of range or not a number', () => {
  assert.ok(errorFor(dataWith([withItem(0, { answer: 6 })]), 'p1-001'));
  assert.ok(errorFor(dataWith([withItem(0, { answer: '1' })]), 'p1-001'));
});

test('validateReading() reports two items with the same answer', () => {
  assert.ok(errorFor(dataWith([withItem(0, { answer: 0 })]), 'p1-001'));
});

test('validateReading() reports an item using the example word', () => {
  assert.ok(errorFor(dataWith([withItem(0, { answer: 2 })]), 'p1-001'));
});

test('validateReading() reports an item without vi or explain', () => {
  assert.ok(errorFor(dataWith([withItem(1, { vi: '' })]), 'p1-001'));
  assert.ok(errorFor(dataWith([withItem(1, { explain: ' ' })]), 'p1-001'));
});

test('validateReading() reports a dialogue item with one line', () => {
  assert.ok(errorFor(dataWith([withItem(0, { text: 'B：路上___得厉害。' }, 'dialogue')]), 'p1-001'));
});

test('validateReading() reports a dialogue line not starting with A： or B：', () => {
  assert.ok(errorFor(dataWith([withItem(0, { text: 'A：你怎么才来？\nC：路上___得厉害。' }, 'dialogue')]), 'p1-001'));
  assert.ok(errorFor(dataWith([withItem(0, { text: 'A:你怎么才来？\nB：路上___得厉害。' }, 'dialogue')]), 'p1-001'));
});

test('validateReading() reports sets of one type that all share the same answers', () => {
  const e = validateReading(dataWith([fillSet('p1-001'), fillSet('p1-002')]));
  assert.ok(e.some((m) => m.includes('sentence')));
});

test('unitsOf() and typeCount() group the sets by type', () => {
  const part = dataWith([fillSet('p1-001'), fillSet('p1-002', 'dialogue'), fillSet('p1-003', 'dialogue')]).parts[0];
  assert.deepEqual(unitsOf(part, 'dialogue').map((s) => s.id), ['p1-002', 'p1-003']);
  assert.equal(unitsOf(part).length, 3);
  assert.deepEqual(typeCount(part), { sentence: 1, dialogue: 2 });
  assert.deepEqual(typeCount(dataWith([]).parts[0]), { sentence: 0, dialogue: 0 });
});
