// Unit tests for the confusable-words logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import VOCAB from '../src/data/vocab.json' with { type: 'json' };
import {
  COMPARE,
  buildCompareQuiz,
  compareKey,
  compareProgress,
  countPairs,
  filterPairs,
  lessonOf,
  pairTitle,
  retryCompareQuiz,
  searchPairs,
  toneless,
  validateCompare,
} from '../src/compare.js';

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
const marksOf = (m) => (k) => m[k] || '';
const GANG = [['刚', 'gāng'], ['刚才', 'gāngcái']];

// A well-formed group: 2 examples per word, 4 questions alternating the answer.
function pair(id, words = GANG) {
  return {
    id,
    words,
    common: 'C',
    rows: [
      ['Từ loại', ...words.map(() => 'x')],
      ['Vị trí', ...words.map(() => 'y')],
    ],
    examples: words.flatMap(([h], k) => [
      [`我${h}来。`, 'py', 'vi', k],
      [`他${h}走。`, 'py', 'vi', k],
    ]),
    tip: 'T',
    questions: [0, 1, 2, 3].map((n) => ({ q: '他___到。', answer: words[n % words.length][0], explain: 'E' })),
  };
}
const FAKE_VOCAB = { L1: { words: [['刚'], ['从来']] }, L2: { words: [['却'], ['而']] } };
const lesson1 = () => [pair('1.1'), pair('1.2', [['从来', 'cónglái'], ['一直', 'yīzhí']]), pair('1.3')];

test('compareKey(), lessonOf() and pairTitle()', () => {
  assert.equal(compareKey('4.3'), 'c:4.3');
  assert.ok(compareKey('20.5').length <= 12);
  assert.equal(lessonOf('12.4'), 'L12');
  assert.equal(pairTitle(pair('1.1', [['却', 'què'], ['而', 'ér'], ['但是', 'dànshì']])), '却 / 而 / 但是');
});

test('toneless() drops tone marks, case, spaces and apostrophes', () => {
  assert.equal(toneless('Suǒ Yǒu'), 'suoyou');
  assert.equal(toneless('yīqiè'), 'yiqie');
  assert.equal(toneless('lǜshī'), 'lushi');
  assert.equal(toneless("Xī'ān"), 'xian');
  assert.equal(toneless('所有'), '所有');
});

test('searchPairs() matches hanzi or pinyin with or without tones, across every given group', () => {
  const pairs = [pair('1.1'), pair('2.1', [['却', 'què'], ['而', 'ér'], ['但是', 'dànshì']]), pair('3.1', [['律师', 'lǜshī'], ['老师', 'lǎoshī']])];
  const ids = (q) => searchPairs(q, pairs).map((p) => p.id);
  assert.deepEqual(ids('刚'), ['1.1']);
  assert.deepEqual(ids('刚才'), ['1.1']);
  assert.deepEqual(ids('gangcai'), ['1.1']);
  assert.deepEqual(ids('Gāng Cái'), ['1.1']);
  assert.deepEqual(ids('dan'), ['2.1']);
  assert.deepEqual(ids('lu'), ['3.1']);
  assert.deepEqual(ids('shi'), ['2.1', '3.1']);
  assert.deepEqual(ids('所有'), []);
  assert.deepEqual(ids(''), []);
  assert.deepEqual(ids('   '), []);
  for (const junk of ["'", '’', '́']) assert.deepEqual(ids(junk), [], JSON.stringify(junk));
});

test('buildCompareQuiz() offers exactly the group words, keeps the answer, tags the group', () => {
  const pairs = [pair('2.1', [['却', 'què'], ['而', 'ér'], ['但是', 'dànshì']]), pair('2.2')];
  const qs = buildCompareQuiz(pairs, { rng: seeded(7) });
  assert.equal(qs.length, 8);
  for (const q of qs) {
    const words = pairs.find((p) => p.id === q.pairId).words.map((w) => w[0]);
    assert.deepEqual([...q.options].sort(), [...words].sort());
    assert.ok(q.options.includes(q.answer));
    assert.equal(q.q.split('___').length, 2);
  }
});

test('buildCompareQuiz() with max spreads questions evenly over the groups', () => {
  const pairs = [pair('1.1'), pair('1.2'), pair('1.3')];
  const qs = buildCompareQuiz(pairs, { max: 6, rng: seeded(2) });
  assert.equal(qs.length, 6);
  for (const id of ['1.1', '1.2', '1.3']) assert.equal(qs.filter((q) => q.pairId === id).length, 2, id);
  assert.deepEqual(buildCompareQuiz([], { max: 30 }), []);
});

test('retryCompareQuiz() reshuffles prepared questions and keeps them answerable', () => {
  const qs = buildCompareQuiz([pair('1.1')], { rng: seeded(5) }).slice(0, 3);
  const again = retryCompareQuiz(qs, seeded(9));
  assert.equal(again.length, 3);
  for (const q of again) {
    assert.equal(q.pairId, '1.1');
    assert.deepEqual([...q.options].sort(), ['刚', '刚才']);
  }
});

test('filterPairs(), countPairs() and compareProgress() use c: marks only', () => {
  const pts = lesson1();
  const getMark = marksOf({ 'c:1.1': 'k', 'c:1.2': 'r', 'g:1.3': 'k', 刚: 'r' });
  assert.deepEqual(filterPairs(pts, 'r', getMark).points.map((p) => p.id), ['1.2']);
  assert.deepEqual(filterPairs(pts, 'new', getMark).points.map((p) => p.id), ['1.3']);
  assert.deepEqual(countPairs(pts, getMark), { n: 3, k: 1, r: 1, fresh: 1 });
  assert.equal(filterPairs(pts, 'k', marksOf({})).fellBack, true);
  assert.deepEqual(compareProgress(getMark)('L99'), { done: 0, total: 0 }, 'unwritten lesson');
});

test('validateCompare() reports null groups and questions instead of throwing', () => {
  assert.ok(validateCompare({ L1: [null, ...lesson1().slice(1)] }, FAKE_VOCAB).some((e) => e.includes('phải là object')));
  const l = lesson1();
  l[0].questions[1] = null;
  assert.ok(validateCompare({ L1: l }, FAKE_VOCAB).some((e) => e.includes('câu 2: phải là object')));
});

test('validateCompare() accepts a well-formed lesson', () => {
  assert.deepEqual(validateCompare({ L1: lesson1(), L2: [] }, FAKE_VOCAB), []);
});

test('validateCompare() reports each kind of problem', () => {
  const edit = (fn) => {
    const l = lesson1();
    fn(l);
    return validateCompare({ L1: l }, FAKE_VOCAB);
  };
  const has = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected "${text}" in ${JSON.stringify(errors)}`);
  has(validateCompare({ L9: lesson1() }, FAKE_VOCAB), 'L9: không có trong vocab.json');
  has(validateCompare({ L1: lesson1().slice(0, 2) }, FAKE_VOCAB), 'cần 3–5 nhóm, có 2');
  has(edit((l) => (l[0].id = '1.9')), 'id phải là "1.1"');
  has(edit((l) => (l[0].words = [['刚', 'gāng']])), 'cần 2–3 từ');
  has(edit((l) => (l[0].words = [['刚', 'gāng'], ['刚', 'gāng']])), 'từ bị trùng');
  has(edit((l) => (l[0].words[1] = ['刚才'])), 'mỗi từ phải là [hán tự, pinyin]');
  has(edit((l) => (l[0].common = ' ')), 'thiếu common');
  has(edit((l) => (l[0].tip = '')), 'thiếu tip');
  has(edit((l) => (l[0].rows = [l[0].rows[0]])), 'cần ≥ 2 dòng so sánh');
  has(edit((l) => (l[0].rows[0] = ['Từ loại', 'x'])), 'dòng 1 phải có 3 ô');
  has(edit((l) => (l[0].examples[0] = ['我来。', 'py', 'vi'])), 'ví dụ 1 phải là [hán tự, pinyin, nghĩa, chỉ số từ]');
  has(edit((l) => (l[0].examples[0] = ['我来。', 'py', 'vi', 0])), 'ví dụ 1 không chứa 刚');
  has(edit((l) => (l[0].examples = l[0].examples.filter((x) => x[3] === 0))), '刚才 cần ≥ 2 ví dụ');
  has(edit((l) => (l[0].questions = l[0].questions.slice(0, 3))), 'cần 4–6 câu hỏi');
  has(edit((l) => (l[0].questions[0].q = '他到了。')), 'câu 1: q phải có đúng một ___');
  has(edit((l) => (l[0].questions[0].answer = '刚刚')), 'câu 1: answer không phải từ của nhóm');
  has(edit((l) => (l[0].questions[1].explain = '')), 'câu 2: thiếu explain');
  has(edit((l) => l[0].questions.forEach((q) => (q.answer = '刚'))), '刚才 chưa là đáp án câu nào');
  has(edit((l) => (l[0].words = [['一直', 'yīzhí'], ['刚才', 'gāngcái']])), 'không từ nào thuộc từ vựng L1');
  has(edit((l) => (l[0].words = [['刚', 'gāng'], ['却', 'què']])), '却 thuộc bài sau');
});

test('compare.json is valid', () => {
  assert.deepEqual(validateCompare(COMPARE, VOCAB), []);
});

// The groups of the first batch, in order (lesson -> words of each group).
const PLANNED = {
  L1: [['刚', '刚才'], ['从来', '一直'], ['即使', '虽然'], ['熟悉', '了解']],
  L2: [['却', '而', '但是'], ['尽管', '即使'], ['理解', '了解'], ['专门', '特别']],
  L3: [['改变', '变化'], ['感觉', '觉得'], ['另外', '其他'], ['不管', '尽管']],
  L4: [['以为', '认为'], ['本来', '原来'], ['及时', '准时', '按时'], ['按照', '根据']],
};

test('lessons 1-4 have the planned groups, in order', () => {
  for (const [l, groups] of Object.entries(PLANNED)) {
    assert.deepEqual(COMPARE[l].map((p) => p.words.map((w) => w[0])), groups, l);
  }
});
