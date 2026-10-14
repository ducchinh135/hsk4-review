// Unit tests for grammar practice logic and the grammar data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import VOCAB from '../src/data/vocab.json' with { type: 'json' };
import {
  GRAMMAR,
  buildGrammarQuiz,
  checkOrder,
  countPoints,
  filterPoints,
  grammarKey,
  grammarProgress,
  lessonOf,
  normalize,
  retryQuiz,
  scramble,
  validateGrammar,
} from '../src/grammar.js';

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
const choice = () => ({ type: 'choice', q: '这家饭馆的菜___便宜，而且很好吃。', options: ['不仅', '尽管', '即使', '从来'], answer: '不仅', explain: 'x' });
const order = () => ({ type: 'order', parts: ['他', '不仅', '聪明', '而且很努力'], answer: '他不仅聪明，而且很努力。', alt: [], vi: 'x' });
function point(id, nq = 6) {
  return {
    id,
    title: 'T' + id,
    pattern: 'P',
    meaning: 'M',
    notes: [],
    examples: [['他来了。', 'Tā lái le.', 'Anh ấy đến rồi.'], ['a', 'b', 'c'], ['a', 'b', 'c']],
    questions: [...Array.from({ length: nq - 1 }, choice), order()],
  };
}
const lesson1 = () => [1, 2, 3, 4, 5].map((n) => point('1.' + n));
const marksOf = (m) => (k) => m[k] || '';

test('grammarKey() and lessonOf() map point ids', () => {
  assert.equal(grammarKey('1.3'), 'g:1.3');
  assert.ok(grammarKey('20.5').length <= 12);
  assert.equal(lessonOf('1.3'), 'L1');
  assert.equal(lessonOf('12.5'), 'L12');
});

test('normalize() drops spaces and Chinese/ASCII punctuation', () => {
  assert.equal(normalize(' 他，不仅 聪明。而且! 很努力？ '), '他不仅聪明而且很努力');
  assert.equal(normalize('“好”……——（对）'), '好对');
});

test('checkOrder() accepts the answer or an alt, ignoring punctuation and spaces', () => {
  const q = { answer: '他不仅聪明，而且很努力。', alt: ['不仅他聪明而且很努力'] };
  assert.equal(checkOrder('他不仅聪明而且很努力', q), true);
  assert.equal(checkOrder('他 不仅 聪明 ， 而且很努力 。', q), true);
  assert.equal(checkOrder('不仅他聪明而且很努力', q), true);
  assert.equal(checkOrder('他聪明不仅而且很努力', q), false);
  assert.equal(checkOrder('他不仅聪明', q), false, 'missing part');
  assert.equal(checkOrder('他不仅聪明而且很努力他', q), false, 'extra part');
  assert.equal(checkOrder('', q), false);
  assert.equal(checkOrder('他不仅聪明而且很努力', { answer: '他不仅聪明而且很努力。' }), true, 'alt is optional');
});

test('scramble() keeps every part, tracks duplicates by index, and never returns the answer order', () => {
  for (let s = 1; s < 200; s++) {
    const parts = ['我', '我', '去', '了'];
    const tiles = scramble(parts, seeded(s));
    assert.deepEqual(tiles.map((t) => t.i).sort(), [0, 1, 2, 3]);
    assert.deepEqual(tiles.map((t) => t.text).sort(), [...parts].sort());
    assert.notEqual(tiles.map((t) => t.text).join(''), parts.join(''), 'seed ' + s);
  }
  for (let s = 1; s < 100; s++) assert.notEqual(scramble(['a', 'b', 'c'], seeded(s)).map((t) => t.text).join(''), 'abc');
});

test('buildGrammarQuiz() takes every question, tags its point and shuffles options and parts', () => {
  const pts = lesson1();
  const before = JSON.stringify(pts);
  const qs = buildGrammarQuiz(pts, { rng: seeded(7) });
  assert.equal(qs.length, 30);
  assert.equal(JSON.stringify(pts), before, 'input not mutated');
  for (const q of qs) {
    assert.match(q.pointId, /^1\.[1-5]$/);
    if (q.type === 'choice') {
      assert.ok(q.options.includes(q.answer));
      assert.deepEqual([...q.options].sort(), ['不仅', '尽管', '即使', '从来'].sort());
    } else {
      assert.deepEqual(q.parts, ['他', '不仅', '聪明', '而且很努力'], 'parts keep the answer order');
      assert.notEqual(q.tiles.map((t) => t.text).join(''), q.parts.join(''));
    }
  }
  assert.equal(qs.filter((q) => q.type === 'order').length, 5);
});

test('buildGrammarQuiz() with max spreads questions evenly over the points', () => {
  const qs = buildGrammarQuiz(lesson1(), { max: 10, rng: seeded(3) });
  assert.equal(qs.length, 10);
  const per = {};
  qs.forEach((q) => (per[q.pointId] = (per[q.pointId] || 0) + 1));
  assert.deepEqual(Object.values(per), [2, 2, 2, 2, 2]);
  assert.equal(buildGrammarQuiz(lesson1(), { max: 7, rng: seeded(3) }).length, 7);
  assert.equal(buildGrammarQuiz(lesson1(), { max: 100 }).length, 30);
  assert.deepEqual(buildGrammarQuiz([], { max: 30 }), []);
});

test('retryQuiz() reshuffles prepared questions and keeps them answerable', () => {
  const qs = buildGrammarQuiz([point('2.1')], { rng: seeded(5) }).slice(0, 3);
  const again = retryQuiz(qs, seeded(9));
  assert.equal(again.length, 3);
  for (const q of again) {
    assert.equal(q.pointId, '2.1');
    if (q.type === 'choice') assert.ok(q.options.includes(q.answer));
    else assert.equal(checkOrder(q.tiles.slice().sort((a, b) => a.i - b.i).map((t) => t.text).join(''), q), true);
  }
});

test('filterPoints() filters by mark and falls back to the whole lesson when empty', () => {
  const pts = lesson1();
  const getMark = marksOf({ 'g:1.1': 'k', 'g:1.2': 'r', 'g:1.3': 'r' });
  assert.deepEqual(filterPoints(pts, 'r', getMark).points.map((p) => p.id), ['1.2', '1.3']);
  assert.deepEqual(filterPoints(pts, 'k', getMark).points.map((p) => p.id), ['1.1']);
  assert.deepEqual(filterPoints(pts, 'new', getMark).points.map((p) => p.id), ['1.4', '1.5']);
  assert.equal(filterPoints(pts, 'all', getMark).points.length, 5);
  const none = filterPoints(pts, 'k', marksOf({}));
  assert.equal(none.fellBack, true);
  assert.equal(none.points.length, 5);
  assert.deepEqual(filterPoints([], 'k', getMark), { points: [], fellBack: false });
});

test('countPoints() and grammarProgress() count marks', () => {
  const getMark = marksOf({ 'g:1.1': 'k', 'g:1.2': 'r', '不仅': 'k' });
  assert.deepEqual(countPoints(lesson1(), getMark), { n: 5, k: 1, r: 1, fresh: 3 });
  assert.deepEqual(grammarProgress(getMark)('L99'), { done: 0, total: 0 }, 'unwritten lesson');
});

test('validateGrammar() accepts a well-formed lesson', () => {
  assert.deepEqual(validateGrammar({ L1: lesson1(), L2: [] }, ['L1', 'L2']), []);
});

test('validateGrammar() reports each kind of problem', () => {
  const has = (data, text) => {
    const errs = validateGrammar(data, ['L1']);
    assert.ok(errs.some((e) => e.includes(text)), `expected "${text}" in ${JSON.stringify(errs)}`);
  };
  const edit = (fn) => {
    const l = lesson1();
    fn(l);
    return { L1: l };
  };
  has({ L9: lesson1() }, 'không có trong vocab.json');
  has({ L1: lesson1().slice(0, 4) }, 'cần đúng 5 điểm');
  has(edit((l) => (l[1].id = '1.7')), 'id phải là "1.2"');
  has(edit((l) => (l[0].title = '')), 'thiếu title');
  has(edit((l) => (l[0].notes = 'x')), 'notes phải là mảng chuỗi');
  has(edit((l) => l[0].examples.pop()), 'cần ≥ 3 ví dụ');
  has(edit((l) => (l[0].examples[0] = ['a', 'b'])), 'ví dụ 1 phải là');
  has(edit((l) => l[0].questions.shift()), 'cần ≥ 6 câu hỏi');
  has(edit((l) => (l[0].questions = Array.from({ length: 6 }, choice))), 'cần cả câu choice và order');
  has(edit((l) => (l[0].questions[0].q = '没有空。')), 'q phải có đúng một ___');
  has(edit((l) => (l[0].questions[0].q = '___和___')), 'q phải có đúng một ___');
  has(edit((l) => (l[0].questions[0].options = ['不仅', '不仅', '即使', '从来'])), 'cần 4 lựa chọn khác nhau');
  has(edit((l) => (l[0].questions[0].options = ['不仅', '即使', '从来'])), 'cần 4 lựa chọn khác nhau');
  has(edit((l) => (l[0].questions[0].answer = '而且')), 'answer không nằm trong options');
  has(edit((l) => (l[0].questions[0].explain = '')), 'thiếu explain');
  has(edit((l) => (l[0].questions[5].parts = ['他不仅聪明', '而且很努力'])), 'cần ≥ 3 cụm');
  has(edit((l) => (l[0].questions[5].parts = ['他', '聪明', '而且很努力'])), 'parts ghép lại không ra answer');
  has(edit((l) => (l[0].questions[5].alt = 'x')), 'alt phải là mảng chuỗi');
  has(edit((l) => (l[0].questions[5].vi = '')), 'thiếu vi');
  has(edit((l) => (l[0].questions[0].type = 'judge')), 'type lạ "judge"');
});

test('grammar.json is valid', () => {
  assert.deepEqual(validateGrammar(GRAMMAR, Object.keys(VOCAB)), []);
});

test('grammar.json has lessons 1 and 2 written', () => {
  for (const l of ['L1', 'L2']) assert.equal(GRAMMAR[l]?.length, 5, l);
});
