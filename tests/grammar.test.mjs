// Unit tests for grammar practice logic and the grammar data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import VOCAB from '../src/data/vocab.json' with { type: 'json' };
import {
  GRAMMAR,
  buildGrammarQuiz,
  buildRoundRobin,
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
const WRITTEN = Object.keys(TEXTBOOK_KEYS); // every lesson of the textbook is written

test('every lesson has the 5 points the textbook lists, in order', () => {
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

// ---------- fixes from the independent review of lessons 3-20 ----------
const ORDER_VARIANTS = [
  ['我本来想去爬山，可是下雨了。', '本来我想去爬山，可是下雨了。'],
  ['这件事本来应该听他的。', '本来这件事应该听他的。'],
  ['你首先应该有一个好身体。', '首先你应该有一个好身体。', '你应该首先有一个好身体。'],
  ['不管天气多冷，他都去跑步。', '他不管天气多冷都去跑步。'],
  ['我们按照计划完成了工作。', '我们按照计划完成工作了。', '按照计划我们完成了工作。'],
  ['按照经验，这个问题应该很快能解决。', '这个问题按照经验应该很快能解决。'],
  ['他们俩长得太像了，甚至父母也分不清。', '他们俩长得太像了，父母甚至也分不清。'],
  ['喝太多酒肯定对身体不好。', '喝太多酒对身体肯定不好。'],
  ['您放心，质量肯定没问题。', '质量肯定没问题，您放心。'],
  ['现在没时间，这件事以后再说。', '这件事现在没时间，以后再说。'],
  ['你们做计划应该联系实际。', '做计划你们应该联系实际。'],
  ['对学生来说，最重要的是认真学习。', '对学生来说，认真学习是最重要的。'],
  ['为小事生气不值得。', '不值得为小事生气。'],
  ['在老师的帮助下，他进步很快。', '他在老师的帮助下进步很快。'],
  ['我估计他六点才能到。', '我估计六点他才能到。'],
  ['他这次考试估计考得不错。', '这次考试估计他考得不错。'],
  ['你要是有时间，就来我家玩儿吧。', '要是你有时间，就来我家玩儿吧。'],
  ['这家饭馆的菜既便宜又好吃。', '这家饭馆的菜既好吃又便宜。'],
  ['散步既可以活动身体，又可以减肥。', '散步既可以减肥，又可以活动身体。'],
  ['只要有时间，我就去看爸妈。', '我只要有时间，就去看爸妈。'],
  ['有经验的司机往往对道路情况很熟悉。', '有经验的司机对道路情况往往很熟悉。'],
  ['难道你没看短信？', '你难道没看短信？'],
  ['难道汉语真的这么难吗？', '汉语难道真的这么难吗？'],
  ['他通过了那家公司的面试。', '他通过那家公司的面试了。'],
  ['虽然收入高，可是经常要加班。', '收入虽然高，可是经常要加班。'],
  ['他虽然写得比较慢，可是写得很认真。', '虽然他写得比较慢，可是写得很认真。'],
  ['他结婚的时候不过二十岁。', '结婚的时候他不过二十岁。'],
  ['由于下雨，比赛改到下周了。', '比赛由于下雨改到下周了。'],
  ['由于工作的需要，他去过上海。', '他由于工作的需要去过上海。'],
  ['我喜欢很多运动，比如游泳、打篮球。', '我喜欢很多运动，比如打篮球、游泳。'],
  ['有些水果很便宜，比如苹果和香蕉。', '有些水果很便宜，比如香蕉和苹果。'],
  ['在学习汉语的同时，我认识了很多朋友。', '我在学习汉语的同时认识了很多朋友。'],
  ['工作再忙，他也每天锻炼。', '他工作再忙，也每天锻炼。'],
  ['对于这件事，我和大家的看法不一样。', '我和大家对于这件事的看法不一样。'],
  ['他对于每个需要帮助的人都很热情。', '对于每个需要帮助的人他都很热情。'],
  ['到现在他大概唱了六十多年。', '他到现在大概唱了六十多年。'],
  ['我平时不喝酒，偶尔喝一点儿。', '平时我不喝酒，偶尔喝一点儿。'],
  ['这件事应该由王大夫负责。', '应该由王大夫负责这件事。'],
  ['今天的饭由我来做。', '由我来做今天的饭。'],
  ['十点半会议继续进行。', '会议十点半继续进行。'],
  ['随着社会的发展，京剧也在改变。', '京剧也随着社会的发展在改变。'],
  ['随着年龄的增长，他们会发现生活总在变化。', '他们会发现随着年龄的增长生活总在变化。'],
  ['你既然不愿意去，为什么还答应？', '既然你不愿意去，为什么还答应？'],
  ['我周末喜欢看电影、逛街什么的。', '周末我喜欢看电影、逛街什么的。'],
  ['我突然想起来得去银行。', '突然我想起来得去银行。'],
  ['快坐起来，别躺着看书。', '别躺着看书，快坐起来。'],
  ['这是她的生日礼物，你千万别告诉她。', '你千万别告诉她，这是她的生日礼物。'],
  ['今天的饭我来做。', '我来做今天的饭。'],
  ['这个会议室的座位恐怕不够。', '恐怕这个会议室的座位不够。'],
  ['我不敢再躺着看书了。', '我再不敢躺着看书了。'],
  ['我不知道她是否能读懂这本书。', '这本书我不知道她是否能读懂。'],
  ['这本书你看完，我接着看。', '你看完这本书，我接着看。'],
  ['大学毕业后，他接着又考上了研究生。', '他大学毕业后接着又考上了研究生。'],
  ['这个周末我哪儿也不想去。', '我这个周末哪儿也不想去。'],
  ['看来今天吃不上羊肉饺子了。', '今天看来吃不上羊肉饺子了。'],
  ['总的来说，这套房子他很满意。', '总的来说，他很满意这套房子。', '这套房子总的来说他很满意。'],
  ['儿子小时候一说话就脸红。', '小时候儿子一说话就脸红。'],
  ['谈起小时候的事，奶奶总是很开心。', '奶奶谈起小时候的事总是很开心。'],
  ['她讲着讲着自己先笑了。', '讲着讲着她自己先笑了。'],
];

test('order questions accept the other natural arrangements of their tiles', () => {
  for (const [answer, ...variants] of ORDER_VARIANTS) {
    const q = ALL_QUESTIONS.find((x) => x.type === 'order' && normalize(x.answer) === normalize(answer));
    assert.ok(q, 'question not found: ' + answer);
    for (const v of variants) {
      assert.equal(checkOrder(v, q), true, v);
      assert.deepEqual([...normalize(v)].sort(), [...normalize(q.parts.join(''))].sort(), 'uses exactly the tiles: ' + v);
    }
  }
});

test('choice distractors that also fit were replaced, and wrong rules corrected', () => {
  const choice = (text) => ALL_QUESTIONS.find((q) => q.type === 'choice' && q.q === text);
  const noOption = (text, bad) => assert.ok(!choice(text).options.includes(bad), `${text} must not offer ${bad}`);
  noOption('我___新工作比以前的好，没想到还没有以前好。', '希望');
  noOption('北京很大，拿交通___，地铁就有很多条线路。', '来看');
  noOption('学习需要方法，拿背生词___，你可以每天背十个。', '来看');
  noOption('他为了学好汉语___来到北京。', '刚');
  noOption('人比动物聪明，但动物___有很多值得学习的地方。', '倒');
  noOption('已经过去很多年了，他___记得那天的事。', '倒');
  noOption('现在年轻人喜欢网上购物，___喜欢在网上买衣服。', '肯定');
  const point = (id) => POINT(id);
  assert.ok(!JSON.stringify(point('12.1').questions).includes('并 phải đứng trước từ phủ định nên không dùng ở đây'), '并 is also a conjunction');
  assert.ok(!JSON.stringify(point('16.2').notes).includes('không có nghĩa “phỏng đoán” của 恐怕'), 'garbled 恐怕/怕 note');
  assert.ok(point('8.2').meaning.includes('điều kiện đủ'), 'only-if vs enough');
  assert.ok(JSON.stringify(point('4.5').examples).includes('fēn bu qīng'), 'neutral tone in the potential complement');
  assert.ok(JSON.stringify(point('16.1').examples).includes('Zhè kě shì ge'), '可 + 是, not the conjunction 可是');
});

test('filterPoints() and countPoints() take another key function', () => {
  const pts = lesson1();
  const keyOf = (id) => 'c:' + id;
  const getMark = marksOf({ 'c:1.1': 'k', 'c:1.2': 'r', 'g:1.3': 'r' });
  assert.deepEqual(filterPoints(pts, 'r', getMark, keyOf).points.map((p) => p.id), ['1.2']);
  assert.deepEqual(filterPoints(pts, 'k', getMark, keyOf).points.map((p) => p.id), ['1.1']);
  assert.deepEqual(countPoints(pts, getMark, keyOf), { n: 5, k: 1, r: 1, fresh: 3 });
  assert.deepEqual(countPoints(pts, getMark), { n: 5, k: 0, r: 1, fresh: 4 }, 'default key is still g:');
});

test('buildRoundRobin() prepares every question with its item id and spreads max over the items', () => {
  const items = [
    { id: 'a', questions: [1, 2, 3] },
    { id: 'b', questions: [4] },
  ];
  const prep = (q, id) => ({ q, id });
  const all = buildRoundRobin(items, prep, { rng: seeded(3) });
  assert.deepEqual(all.map((x) => x.q).sort(), [1, 2, 3, 4]);
  for (const x of all) assert.equal(x.id, x.q === 4 ? 'b' : 'a');
  const two = buildRoundRobin(items, prep, { max: 2, rng: seeded(3) });
  assert.deepEqual(two.map((x) => x.id).sort(), ['a', 'b']);
  assert.deepEqual(buildRoundRobin([], prep, { max: 5 }), []);
});

test('buildGrammarQuiz() gives the same run as before for the same seed', () => {
  const a = buildGrammarQuiz(lesson1(), { max: 7, rng: seeded(11) });
  const b = buildGrammarQuiz(lesson1(), { max: 7, rng: seeded(11) });
  assert.deepEqual(a, b);
  assert.equal(a.length, 7);
});
