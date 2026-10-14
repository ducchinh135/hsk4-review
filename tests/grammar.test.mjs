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

// The 5 notes of each lesson as printed in the textbook's contents page (each title must contain its key).
const TEXTBOOK_KEYS = {
  L1: ['不仅', '从来', '刚', '即使', '上'],
  L2: ['正好', '差不多', '尽管', '却', '而'],
  L3: ['挺', '本来', '另外', '首先', '不管'],
  L4: ['以为', '原来', '并', '按照', '甚至'],
  L5: ['肯定', '再说', '实际', '对', '尤其'],
  L6: ['竟然', '倍', '值得', '其中', '下'],
  L7: ['估计', '来不及', '离合词', '要是', '既'],
  L8: ['使', '只要', '可不是', '因此', '往往'],
  L9: ['难道', '通过', '可是', '结果', '上'],
  L10: ['不过', '确实', '看来', '由于', '比如'],
  L11: ['连', '否则', '无论', '然而', '同时'],
  L12: ['并且', '再', '对于', '量词', '相反'],
  L13: ['大概', '偶尔', '由', '进行', '随着'],
  L14: ['够', '以', '既然', '于是', '什么的'],
  L15: ['想起来', '弄', '千万', '来', '左右'],
  L16: ['可', '恐怕', '到底', '拿', '敢'],
  L17: ['倒', '干', '趟', '为了', '仍然'],
  L18: ['是否', '受不了', '接着', '除此以外', '叫作'],
  L19: ['疑问代词', '上', '出来', '总的来说', '在于'],
  L20: ['着', '就', '究竟', '起来', '起'],
};
const WRITTEN = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18'];

test('written lessons have the 5 points the textbook lists, in order', () => {
  for (const l of WRITTEN) {
    assert.equal(GRAMMAR[l]?.length, 5, l + ' should have 5 points');
    GRAMMAR[l].forEach((p, i) => assert.ok(p.title.includes(TEXTBOOK_KEYS[l][i]), `${p.id} "${p.title}" should contain "${TEXTBOOK_KEYS[l][i]}"`));
  }
});

const byAnswer = (a) => ALL_QUESTIONS.find((q) => q.answer === a);
const ALL_QUESTIONS = Object.values(GRAMMAR).flat().flatMap((p) => p.questions);

test('order questions accept the same-meaning variants a learner could build', () => {
  const variants = [
    ['这个城市不仅很大，还很漂亮。', '这个城市不仅很漂亮，还很大。'],
    ['这件衣服我穿正好。', '我穿这件衣服正好。'],
    ['我和他差不多高。', '他和我差不多高。'],
    ['从这儿到学校差不多要二十分钟。', '从这儿到学校要差不多二十分钟。'],
    ['尽管天气很冷，他还是去跑步了。', '天气尽管很冷，他还是去跑步了。'],
    ['尽管工作很忙，她却没有忘记给妈妈打电话。', '工作尽管很忙，她却没有忘记给妈妈打电话。'],
  ];
  for (const [answer, variant] of variants) {
    const q = byAnswer(answer);
    assert.ok(q, 'question not found: ' + answer);
    assert.equal(checkOrder(variant, q), true, variant);
  }
  // a swapped meaning stays wrong
  assert.equal(checkOrder('从学校到这儿差不多要二十分钟。', byAnswer('从这儿到学校差不多要二十分钟。')), false);
});

test('choice question 2.4 "他很聪明，___他不努力" has one fitting option', () => {
  const q = ALL_QUESTIONS.find((x) => x.q === '他很聪明，___他不努力。');
  assert.ok(q);
  for (const bad of ['所以', '因为']) assert.ok(!q.options.includes(bad), bad);
});

test('explanations have no known wording errors', () => {
  const explains = ALL_QUESTIONS.filter((q) => q.type === 'choice').map((q) => q.explain);
  assert.ok(!explains.some((e) => e.includes('cứ cứ')), 'typo "cứ cứ"');
  const first = ALL_QUESTIONS.find((q) => q.q === '这家饭馆的菜___便宜，而且很好吃。');
  assert.ok(!first.explain.includes('即使 cần vế chuyển ý'), '即使 pairs with 也, not a turning clause');
});

const ALL_TEXT = JSON.stringify([GRAMMAR.L1, GRAMMAR.L2]); // these checks are about lessons 1-2 only
const POINT = (id) => Object.values(GRAMMAR).flat().find((p) => p.id === id);

test('usages the textbook does not teach in lessons 1-2 are not included', () => {
  for (const out of ['你尽管问', '简单而有效', '聪明而幽默', '刚才的事情', '不但', '即使是']) {
    assert.ok(!ALL_TEXT.includes(out), out);
  }
});

test('usages the textbook teaches are covered by notes or examples', () => {
  const has = (id, text) => assert.ok(JSON.stringify(POINT(id)).includes(text), `${id} should mention ${text}`);
  has('1.2', '从来只');
  has('1.3', '上个月刚'); // 刚 can follow a time word, 刚才 cannot
  has('1.4', 'đã xảy ra'); // 即使 can also state a fact
  has('1.5', '课上'); // 上 also means "within a scope"
  has('2.2', '几乎');
  has('2.4', 'nhẹ hơn');
  has('2.5', '而不要'); // parallel use
});
