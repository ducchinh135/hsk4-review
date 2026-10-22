// Unit tests for the reading logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAW from '../src/data/reading.json' with { type: 'json' };
import { buildMix, buildRun, gradeOrder, orderResultLabel, highlightClues, mixSize, orderKeyAction, orderString, orderedSentences, pickSentence, unitNoun, unpickSentence, clearSlot, emptyFill, filledText, fillKeyAction, gradeSet, isFull, placeWord, readKey, reviewUnits, selectSlot, typeCount, unitsOf, usedWords, validateReading } from '../src/reading.js';

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

// Part 2 (排列顺序)
const orderQ = (id, type = 'pair', over = {}) => ({
  id,
  type,
  sentences: [
    { text: '所以我们全家经常开车过去吃。', pinyin: 'Suǒyǐ wǒmen quán jiā jīngcháng kāichē guòqu chī.', vi: 'nên cả nhà tôi hay lái xe đến ăn.' },
    { text: '虽然这家饭馆离我家有点儿远，', pinyin: 'Suīrán zhè jiā fànguǎn lí wǒ jiā yǒudiǎnr yuǎn,', vi: 'Tuy quán này hơi xa nhà tôi,' },
    { text: '但是菜做得特别好吃，价格也不贵，', pinyin: 'dànshì cài zuò de tèbié hǎochī, jiàgé yě bú guì,', vi: 'nhưng món rất ngon, giá cũng không đắt,' },
  ],
  answer: 'BCA',
  clues: ['虽然', '但是', '所以'],
  explain: { first: 'B có 虽然.', next: 'C có 但是.', last: 'A có 所以.' },
  ...over,
});

const dataWithOrder = (questions) => ({
  parts: [
    {
      id: 'p2',
      format: 'order',
      name: '排列顺序',
      label: 'Sắp xếp câu',
      desc: 'x',
      mixCount: 10,
      tips: { intro: '', sections: [] },
      types: ['pair', 'ref', 'time', 'topic'].map((id) => ({ id, icon: '🔗', name: id, desc: 'x', tip: '' })),
      questions,
    },
  ],
});
const orderError = (over) => errorFor(dataWithOrder([orderQ('p2-001', 'pair', over)]), 'p2-001');

test('validateReading() accepts valid order questions', () => {
  assert.deepEqual(validateReading(dataWithOrder([orderQ('p2-001')])), []);
  const other = orderQ('p2-002', 'pair', { answer: 'CBA', sentences: [orderQ('x').sentences[0], orderQ('x').sentences[2], orderQ('x').sentences[1]] });
  assert.deepEqual(validateReading(dataWithOrder([orderQ('p2-001'), other])), []);
});

test('validateReading() reports 2 or 4 sentences and a sentence without pinyin', () => {
  const s = orderQ('x').sentences;
  assert.ok(orderError({ sentences: s.slice(0, 2) }));
  assert.ok(orderError({ sentences: [...s, s[0]] }));
  assert.ok(orderError({ sentences: [s[0], { ...s[1], pinyin: '' }, s[2]] }));
});

test('validateReading() reports an answer that is ABC or not an order of A, B, C', () => {
  for (const answer of ['ABC', 'ABD', 'AAB', 'BC', 'bca']) assert.ok(orderError({ answer }), answer);
});

test('validateReading() reports empty clues, a clue not in the sentences and a missing explain step', () => {
  assert.ok(orderError({ clues: [] }));
  assert.ok(orderError({ clues: ['虽然', '因为'] }));
  assert.ok(orderError({ explain: { first: 'x', next: 'y' } }));
});

test('validateReading() reports a paragraph that does not end with 。！？', () => {
  const s = orderQ('x').sentences;
  assert.ok(orderError({ sentences: [{ ...s[0], text: '所以我们全家经常开车过去吃，' }, s[1], s[2]] }));
});

test('validateReading() reports a bad order id or type', () => {
  assert.ok(errorFor(dataWithOrder([orderQ('p2-1')]), 'p2-1'));
  assert.ok(orderError({ type: 'nope' }));
});

test('validateReading() reports order questions of one type that all share the same answer', () => {
  const e = validateReading(dataWithOrder([orderQ('p2-001'), orderQ('p2-002')]));
  assert.ok(e.some((m) => m.includes('pair')));
});

test('unitsOf() returns the questions of an order part', () => {
  const part = dataWithOrder([orderQ('p2-001'), orderQ('p2-002', 'ref')]).parts[0];
  assert.deepEqual(unitsOf(part).map((q) => q.id), ['p2-001', 'p2-002']);
  assert.deepEqual(unitsOf(part, 'ref').map((q) => q.id), ['p2-002']);
});

test('pickSentence() appends a sentence once; unpickSentence() closes the gap', () => {
  assert.deepEqual(pickSentence([], 1), [1]);
  assert.deepEqual(pickSentence([1], 1), [1]);
  assert.deepEqual(pickSentence([1, 2], 0), [1, 2, 0]);
  assert.deepEqual(unpickSentence([1, 2, 0], 1), [2, 0]);
});

test('orderString(), gradeOrder() and orderedSentences()', () => {
  const q = orderQ('p2-001');
  assert.equal(orderString([1, 2, 0]), 'BCA');
  assert.deepEqual(gradeOrder(q, [1, 2, 0]), { given: 'BCA', ok: true });
  assert.deepEqual(gradeOrder(q, [0, 1, 2]), { given: 'ABC', ok: false });
  assert.deepEqual(orderedSentences(q).map((x) => x.text), [q.sentences[1].text, q.sentences[2].text, q.sentences[0].text]);
});

test('highlightClues() marks every clue and keeps the text', () => {
  const join = (parts) => parts.map((x) => x.text).join('');
  const a = highlightClues('虽然远，但是好。', ['虽然', '但是']);
  assert.deepEqual(a, [
    { text: '虽然', hit: true },
    { text: '远，', hit: false },
    { text: '但是', hit: true },
    { text: '好。', hit: false },
  ]);
  const b = highlightClues('但是但是', ['但']);
  assert.deepEqual(b, [
    { text: '但', hit: true },
    { text: '是', hit: false },
    { text: '但', hit: true },
    { text: '是', hit: false },
  ]);
  assert.deepEqual(highlightClues('但是', ['但', '但是']), [{ text: '但是', hit: true }]);
  assert.deepEqual(highlightClues('他走了。', ['因为']), [{ text: '他走了。', hit: false }]);
  for (const [t, c] of [['虽然远，但是好。', ['虽然', '但是']], ['但是但是', ['但']], ['但是', ['但', '但是']]]) assert.equal(join(highlightClues(t, c)), t);
});

test('orderKeyAction()', () => {
  const k = (key, full = false, target = 'other', graded = false) => orderKeyAction({ key, graded, full, target });
  assert.equal(k('b'), 'pick:1');
  assert.equal(k('C'), 'pick:2');
  assert.equal(k('d'), null);
  assert.equal(k('Backspace'), 'pop');
  assert.equal(k('Enter'), null);
  assert.equal(k('Enter', false, 'answer'), 'none');
  assert.equal(k(' ', false, 'answer'), 'none');
  assert.equal(k('Enter', true), 'check');
  assert.equal(k('Enter', true, 'control'), null);
  assert.equal(k('Enter', true, 'other', true), 'next');
  assert.equal(k('a', true, 'other', true), null);
  for (const key of ['a', 'Enter', 'Backspace']) assert.equal(k(key, true, 'field'), null);
});

test('buildMix() on an order part takes mixCount questions in turn from each type', () => {
  const qs = ['pair', 'ref', 'time', 'topic'].flatMap((t, i) => [0, 1, 2].map((j) => orderQ(`p2-${i}0${j}`, t)));
  const mix = buildMix(dataWithOrder(qs).parts[0]);
  assert.equal(mix.length, 10);
  assert.equal(new Set(mix.map((q) => q.id)).size, 10);
  assert.deepEqual([...new Set(mix.map((q) => q.type))].sort(), ['pair', 'ref', 'time', 'topic']);
  assert.equal(buildMix(dataWithOrder([orderQ('p2-001'), orderQ('p2-002')]).parts[0]).length, 2);
});

test('unitNoun() and mixSize()', () => {
  assert.equal(unitNoun(dataWith([]).parts[0]), 'bộ');
  assert.equal(unitNoun(dataWithOrder([]).parts[0]), 'câu');
  assert.equal(mixSize(dataWithOrder([]).parts[0]), 10);
  assert.equal(mixSize({ format: 'order' }), 10);
});

test('orderResultLabel() shows the learner order and the right one', () => {
  assert.equal(orderResultLabel(orderQ('p2-001'), 'ABC'), 'Bạn xếp A → B → C · Đúng B → C → A');
});

// Part 3 (阅读理解)
const readQ = (answer = 1, over = {}) => ({
  text: '根据这段话，可以知道：',
  pinyin: 'Gēnjù zhè duàn huà, kěyǐ zhīdào:',
  vi: 'Theo đoạn văn, có thể biết:',
  options: ['小王刚来公司', '大家认为小王会被选上', '小王不想去上海', '领导对小王不满意'].map((t, i) => ({ text: t, pinyin: 'p' + i, vi: 'v' + i })),
  answer,
  evidence: ['大家都觉得这次一定是他'],
  explain: 'Giải thích.',
  ...over,
});
const readP = (id, type = 'detail', over = {}) => ({
  id,
  type,
  text: '小王做事一直很认真。这次公司要选一个人去上海工作一年，大家都觉得这次一定是他。',
  pinyin: 'Xiǎo Wáng zuò shì yìzhí hěn rènzhēn.',
  vi: 'Tiểu Vương làm việc luôn rất chăm chỉ.',
  questions: type === 'long' ? [readQ(1), readQ(2, { evidence: ['小王做事一直很认真'] })] : [readQ(1)],
  ...over,
});
const dataWithRead = (passages) => ({
  parts: [
    {
      id: 'p3',
      format: 'read',
      name: '阅读理解',
      label: 'Đọc hiểu',
      desc: 'x',
      tips: { intro: '', sections: [] },
      types: ['detail', 'gist', 'infer', 'word', 'long'].map((id) => ({ id, icon: '🔎', name: id, desc: 'x', tip: '' })),
      passages,
    },
  ],
});
const readError = (over, type = 'detail') => errorFor(dataWithRead([readP('p3-001', type, over)]), 'p3-001');
const withQ = (over, type = 'detail') => {
  const p = readP('p3-001', type);
  return { questions: [{ ...p.questions[0], ...over }, ...p.questions.slice(1)] };
};

test('validateReading() accepts valid short and long passages', () => {
  assert.deepEqual(validateReading(dataWithRead([readP('p3-001'), readP('p3-002', 'long')])), []);
});

test('validateReading() reports a bad passage id or type and a missing passage field', () => {
  assert.ok(errorFor(dataWithRead([readP('p3-1')]), 'p3-1'));
  assert.ok(readError({ type: 'nope' }));
  assert.ok(readError({ vi: '' }));
});

test('validateReading() reports the wrong number of questions for the type', () => {
  assert.ok(readError({ questions: [readQ(1), readQ(2)] }));
  assert.ok(readError({ questions: [readQ(1)] }, 'long'));
});

test('validateReading() reports bad options and answers', () => {
  const o = readQ().options;
  assert.ok(readError(withQ({ options: o.slice(0, 3) })));
  assert.ok(readError(withQ({ options: [o[0], o[0], o[2], o[3]] })));
  assert.ok(readError(withQ({ options: [o[0], { ...o[1], pinyin: '' }, o[2], o[3]] })));
  assert.ok(readError(withQ({ answer: 4 })));
  assert.ok(readError(withQ({ answer: '1' })));
});

test('validateReading() reports bad evidence, a missing explain and a missing question text', () => {
  assert.ok(readError(withQ({ evidence: [] })));
  assert.ok(readError(withQ({ evidence: ['不在这段话里'] })));
  assert.ok(readError(withQ({ explain: '' })));
  assert.ok(readError(withQ({ text: '' })));
});

test('validateReading() reports passages of one type that all share the same answers', () => {
  const e = validateReading(dataWithRead([readP('p3-001'), readP('p3-002')]));
  assert.ok(e.some((m) => m.includes('detail')));
});

test('validateReading() reports two identical sentences in an order question', () => {
  const s = orderQ('x').sentences;
  assert.ok(orderError({ sentences: [s[0], s[1], { ...s[2], text: s[1].text }] }));
});

test('unitsOf() picks the units by format', () => {
  assert.deepEqual(unitsOf(dataWithRead([readP('p3-001')]).parts[0]).map((p) => p.id), ['p3-001']);
  const order = { ...dataWithOrder([orderQ('p2-001')]).parts[0], sets: [] };
  assert.deepEqual(unitsOf(order).map((q) => q.id), ['p2-001']);
});
