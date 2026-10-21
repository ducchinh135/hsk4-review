// Unit tests for the reading logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAW from '../src/data/reading.json' with { type: 'json' };
import { buildMix, buildRun, clearSlot, emptyFill, filledText, fillKeyAction, gradeSet, isFull, placeWord, readKey, reviewUnits, selectSlot, typeCount, unitsOf, usedWords, validateReading } from '../src/reading.js';

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

// Places the words in order, starting from slot 0.
const filled = (set, words) => words.reduce((f, w) => placeWord(f, w, set), emptyFill());

test('placeWord() fills the current slot and moves to the next empty one', () => {
  const set = fillSet('p1-001');
  let f = placeWord(emptyFill(), 3, set);
  assert.equal(f.slots[0], 3);
  assert.equal(f.cur, 1);
  f = placeWord(f, 0, set);
  assert.equal(f.cur, 2);
});

test('placeWord() moves a word already placed elsewhere and wraps to the first empty slot', () => {
  const set = fillSet('p1-001');
  let f = placeWord(placeWord(emptyFill(), 3, set), 0, set);
  f = placeWord(selectSlot(f, 4), 3, set);
  assert.deepEqual(f.slots, [null, 0, null, null, 3]);
  assert.equal(f.cur, 0);
});

test('placeWord() ignores the example word', () => {
  const set = fillSet('p1-001');
  const f = placeWord(emptyFill(), 3, set);
  assert.deepEqual(placeWord(f, 2, set), f);
});

test('placeWord() on a full set takes the word from its slot and drops the replaced word', () => {
  const set = fillSet('p1-001');
  const f = placeWord(selectSlot(filled(set, ANSWERS), 1), 4, set);
  assert.deepEqual(f.slots, [3, 4, 5, 1, null]);
  assert.equal(f.cur, 4);
});

test('clearSlot(), isFull() and usedWords()', () => {
  const set = fillSet('p1-001');
  const full = filled(set, ANSWERS);
  assert.equal(isFull(full), true);
  assert.equal(isFull(emptyFill()), false);
  const cleared = clearSlot(selectSlot(full, 2));
  assert.equal(cleared.slots[2], null);
  assert.equal(isFull(cleared), false);
  assert.deepEqual([...usedWords(set, emptyFill().slots)], [2]);
  assert.deepEqual([...usedWords(set, cleared.slots)].sort(), [0, 1, 2, 3, 4]);
});

test('gradeSet() scores each blank', () => {
  const set = fillSet('p1-001');
  assert.deepEqual(gradeSet(set, ANSWERS), { results: [true, true, true, true, true], score: 5 });
  assert.deepEqual(gradeSet(set, [0, 3, 5, 1, 4]), { results: [false, false, true, true, true], score: 3 });
});

test('fillKeyAction() while filling', () => {
  const k = (key, full = false, target = 'other') => fillKeyAction({ key, graded: false, full, target });
  assert.equal(k('C'), 'word:2');
  assert.equal(k('f'), 'word:5');
  assert.equal(k('g'), null);
  assert.equal(k('3'), 'slot:2');
  assert.equal(k('6'), null);
  assert.equal(k('0'), null);
  assert.equal(k('Backspace'), 'clear');
  assert.equal(k('Enter'), null);
  assert.equal(k('Enter', true), 'submit');
  assert.equal(k('Enter', true, 'control'), null);
  assert.equal(k('ArrowLeft'), null);
});

test('fillKeyAction() once graded, and never while typing', () => {
  assert.equal(fillKeyAction({ key: 'Enter', graded: true, full: true, target: 'other' }), 'next');
  assert.equal(fillKeyAction({ key: 'Enter', graded: true, full: true, target: 'control' }), null);
  assert.equal(fillKeyAction({ key: 'a', graded: true, full: true, target: 'other' }), null);
  for (const key of ['a', '1', 'Enter', 'Backspace']) assert.equal(fillKeyAction({ key, graded: false, full: true, target: 'field' }), null);
});

test('buildMix() takes one set of each type in type order', () => {
  const part = dataWith([fillSet('p1-001', 'dialogue'), fillSet('p1-002'), fillSet('p1-003', 'dialogue'), fillSet('p1-004')]).parts[0];
  const mix = buildMix(part);
  assert.deepEqual(mix.map((s) => s.type), ['sentence', 'dialogue']);
  const noDialogue = dataWith([fillSet('p1-001'), fillSet('p1-002')]).parts[0];
  assert.deepEqual(buildMix(noDialogue).map((s) => s.type), ['sentence']);
});

test('reviewUnits() returns the marked sets in id order; buildRun() caps the run', () => {
  const part = dataWith([fillSet('p1-003'), fillSet('p1-001'), fillSet('p1-002')]).parts[0];
  const marks = { [readKey('p1-003')]: 'r', [readKey('p1-001')]: 'r', [readKey('p1-002')]: 'k' };
  assert.deepEqual(reviewUnits((k) => marks[k], part).map((s) => s.id), ['p1-001', 'p1-003']);
  const many = Array.from({ length: 9 }, (_, i) => ({ id: i }));
  assert.equal(buildRun(many, { max: 6 }).length, 6);
  assert.equal(buildRun(many).length, 9);
});

test('filledText() puts the word in the blank', () => {
  assert.equal(filledText('他___了。', '走'), '他走了。');
});

test('fillKeyAction() swallows Enter and Space on a focused word or blank button', () => {
  const k = (key, full, graded = false) => fillKeyAction({ key, graded, full, target: 'answer' });
  assert.equal(k('Enter', false), 'none');
  assert.equal(k(' ', false), 'none');
  assert.equal(k(' ', true), 'none');
  assert.equal(k('Enter', true), 'submit');
  assert.equal(k('c', false), 'word:2');
  assert.equal(k('Enter', true, true), 'next');
});
