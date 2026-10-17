// Unit tests for the confusable-words logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PAIRS,
  LETTER_ORDER,
  LETTERS,
  LETTER_RANGES,
  TOTAL_PAIRS,
  buildCompareQuiz,
  compareKey,
  compareProgress,
  countPairs,
  filterPairs,
  letterOf,
  loadCompareLetter,
  pairIdFromHash,
  pairTitle,
  pairsOfLetter,
  retryCompareQuiz,
  reviewPairs,
  searchPairs,
  toneless,
  validateCompare,
} from '../src/compare.js';

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
const marksOf = (m) => (k) => m[k] || '';
const GANG = [['刚', 'gāng'], ['刚才', 'gāngcái']];

// A well-formed group: 2 examples per word, max(4, words) questions cycling through the answers.
function pair(id, words = GANG, letter = letterOf(id)) {
  const count = Math.max(4, words.length);
  return {
    id,
    letter,
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
    questions: Array.from({ length: count }, (_, n) => ({ q: '他___到。', answer: words[n % words.length][0], explain: 'E' })),
  };
}
const FIVE = [['别', 'bié'], ['别的', 'biéde'], ['另', 'lìng'], ['另外', 'lìngwài'], ['并', 'bìng']];
const sample = () => [pair('001'), pair('002', [['从来', 'cónglái'], ['一直', 'yīzhí']]), pair('006')];

// The index of the book: group n (1-based) -> its words, as listed in the table of contents.
// 055, 108: the "(不)" variants are written out; variants such as 刚刚, 不论, 没有 go in the text of the group.
const BOOK = [
  /* A */ ['爱', '喜欢'], ['安静', '平静', '宁静'], ['按', '照'], ['按照', '依照'], ['暗暗', '悄悄', '偷偷'],
  /* B */ ['帮', '帮忙', '帮助'], ['宝贵', '珍贵'], ['抱歉', '道歉'], ['被', '叫', '让'], ['本来', '原来'],
  ['比较', '比', '较'], ['必定', '必然', '一定'], ['必须', '必需', '必要'], ['别', '别的', '另', '另外'], ['并', '并且'],
  ['不', '没'], ['不必', '不用'], ['不但', '不仅', '不只'], ['不得不', '只得', '只好'], ['不见得', '不一定'],
  ['不然', '否则'], ['不由得', '不禁'], ['不在乎', '无所谓'],
  /* C */ ['曾经', '曾', '已经'], ['差不多', '差点儿', '几乎'], ['常', '常常', '往往', '经常'], ['朝', '向', '往'],
  ['处处', '到处'], ['从不', '从未'], ['从前', '以前'],
  /* D */ ['答复', '回答'], ['大半', '大都', '多半'], ['大概', '大约'], ['但', '但是', '可是', '不过'], ['当中', '其中'],
  ['到底', '毕竟', '究竟', '终于'], ['的', '得', '地'], ['的确', '确实'], ['懂', '了解', '明白', '知道'], ['对', '对于', '关于'],
  ['多少', '几'],
  /* E */ ['而且', '并且'], ['二', '两'],
  /* F */ ['发达', '发展'], ['反而', '相反'], ['返', '回'], ['房间', '房子', '房屋', '屋子'], ['仿佛', '好像', '似乎'],
  ['非常', '很', '挺', '十分', '极'],
  /* G */ ['赶紧', '赶快'], ['刚', '刚才'], ['跟', '和', '及', '与'],
  /* H */ ['还', '再', '又'], ['还是', '或者'], ['好不容易', '很不容易'], ['忽然', '突然', '猛然'],
  /* J */ ['急忙', '连忙', '匆忙'], ['急忙', '连忙', '赶忙'], ['既', '既然'], ['将来', '未来'], ['讲', '说', '谈'],
  ['尽管', '即使', '虽然'], ['经历', '经过', '通过'], ['净', '老是', '总', '总是'], ['竟', '竟然', '不料', '居然'],
  ['据说', '听说'], ['决定', '决心'],
  /* K */ ['开始', '起初', '最初', '当初'], ['看', '看见'], ['看来', '看起来', '看样子', '看上去'], ['靠', '凭'],
  /* L */ ['留念', '纪念'], ['流传', '流行', '传播'], ['旅行', '旅游', '游览'],
  /* M */ ['马上', '立刻', '顿时'], ['买卖', '生意', '贸易', '交易'], ['满意', '满足'], ['没关系', '没什么', '没事儿'],
  ['每', '各'], ['美丽', '漂亮', '好看'], ['免得', '省得'],
  /* N */ ['那', '那么'], ['难怪', '怪不得'], ['难过', '难受'], ['难免', '不免'], ['难为', '为难'], ['年纪', '年龄', '岁数', '岁'],
  /* O */ ['偶尔', '偶然'],
  /* P */ ['怕', '恐怕'], ['偏', '偏偏'],
  /* Q */ ['其实', '实际上'], ['恰好', '恰巧', '正好'], ['千万', '万万', '一定'], ['亲身', '亲自'], ['全部', '所有', '一切'],
  /* R */ ['认为', '以为'], ['仍', '仍然', '依然', '还是'], ['仍旧', '依旧'],
  /* S */ ['稍稍', '稍微', '稍'], ['似', '像'], ['舒服', '舒适'], ['虽', '虽然', '虽说', '别看'], ['随', '随着', '跟'],
  /* T */ ['特别', '特地', '特意'], ['疼', '痛'], ['同样', '一般', '一样'],
  /* W */ ['为', '为了'], ['无论', '不管'], ['无论', '无论如何', '不管'],
  /* X */ ['喜欢', '喜爱'], ['细心', '仔细', '小心'], ['先后', '前后'], ['向来', '一向', '一直', '从来'], ['谢谢', '感谢', '感激'],
  ['幸亏', '多亏'],
  /* Y */ ['以后', '之后', '以来', '后', '后来'], ['因此', '因而', '因为', '由于'], ['拥有', '有'], ['于是', '所以'],
  /* Z */ ['再三', '一再'], ['怎么', '怎么样', '怎样'], ['至多', '最多'], ['至少', '最少'], ['终于', '最后'], ['最近', '近来'],
];

// localStorage does not exist (or is read-only) in Node; swap in a stub for one call.
function withStorage(stub, fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved);
    else delete globalThis.localStorage;
  }
}

test('compareKey(), letterOf() and pairTitle()', () => {
  assert.equal(compareKey('051'), 'c:051');
  assert.ok(compareKey('125').length <= 12);
  assert.equal(letterOf('001'), 'A');
  assert.equal(letterOf('023'), 'B');
  assert.equal(letterOf('096'), 'R');
  assert.equal(letterOf('125'), 'Z');
  assert.equal(letterOf('126'), undefined);
  assert.equal(letterOf('1.1'), undefined);
  assert.equal(pairTitle(pair('034', [['但', 'dàn'], ['但是', 'dànshì'], ['可是', 'kěshì']])), '但 / 但是 / 可是');
});

test('LETTER_RANGES cover 001-125 in order with no gap or overlap', () => {
  let next = 1;
  for (const l of LETTER_ORDER) {
    const [from, to] = LETTER_RANGES[l];
    assert.equal(from, next, l);
    assert.ok(to >= from, l);
    next = to + 1;
  }
  assert.equal(next, TOTAL_PAIRS + 1);
});

test('LETTERS lists the letters that have groups, in alphabet-of-the-book order', () => {
  assert.deepEqual(LETTERS, LETTER_ORDER.filter((l) => ALL_PAIRS.some((p) => p.letter === l)));
  assert.equal(LETTERS.length, LETTER_ORDER.length, 'every letter has at least one group now that all 125 are written');
});

test('BOOK has the 125 groups of the table of contents', () => {
  assert.equal(BOOK.length, TOTAL_PAIRS);
  assert.deepEqual(BOOK[50], ['刚', '刚才'], '051');
  assert.deepEqual(BOOK[95], ['认为', '以为'], '096');
  assert.deepEqual(BOOK[124], ['最近', '近来'], '125');
});

test('toneless() drops tone marks, case, spaces and apostrophes', () => {
  assert.equal(toneless('Suǒ Yǒu'), 'suoyou');
  assert.equal(toneless('yīqiè'), 'yiqie');
  assert.equal(toneless('lǜshī'), 'lushi');
  assert.equal(toneless("Xī'ān"), 'xian');
  assert.equal(toneless('所有'), '所有');
});

test('searchPairs() matches hanzi or pinyin with or without tones, across every given group', () => {
  const pairs = [pair('051'), pair('034', [['但', 'dàn'], ['但是', 'dànshì'], ['可是', 'kěshì']]), pair('100', [['律师', 'lǜshī'], ['老师', 'lǎoshī']])];
  const ids = (q) => searchPairs(q, pairs).map((p) => p.id);
  assert.deepEqual(ids('刚'), ['051']);
  assert.deepEqual(ids('刚才'), ['051']);
  assert.deepEqual(ids('gangcai'), ['051']);
  assert.deepEqual(ids('Gāng Cái'), ['051']);
  assert.deepEqual(ids('dan'), ['034']);
  assert.deepEqual(ids('lu'), ['100']);
  assert.deepEqual(ids('shi'), ['034', '100']);
  assert.deepEqual(ids('所有'), []);
  assert.deepEqual(ids(''), []);
  assert.deepEqual(ids('   '), []);
  for (const junk of ["'", '’', '́']) assert.deepEqual(ids(junk), [], JSON.stringify(junk));
});

test('buildCompareQuiz() offers exactly the group words, keeps the answer, tags the group', () => {
  const pairs = [pair('034', [['但', 'dàn'], ['但是', 'dànshì'], ['可是', 'kěshì']]), pair('051')];
  const qs = buildCompareQuiz(pairs, { rng: seeded(7) });
  assert.equal(qs.length, 8);
  for (const q of qs) {
    const words = pairs.find((p) => p.id === q.pairId).words.map((w) => w[0]);
    assert.deepEqual([...q.options].sort(), [...words].sort());
    assert.ok(q.options.includes(q.answer));
    assert.equal(q.q.split('___').length, 2);
  }
});

test('buildCompareQuiz() gives a 5-word group 5 options and at least 5 questions', () => {
  const qs = buildCompareQuiz([pair('014', FIVE)], { rng: seeded(3) });
  assert.equal(qs.length, 5);
  for (const q of qs) assert.deepEqual([...q.options].sort(), FIVE.map((w) => w[0]).sort());
  assert.deepEqual(new Set(qs.map((q) => q.answer)), new Set(FIVE.map((w) => w[0])));
});

test('buildCompareQuiz() with max spreads questions evenly over the groups', () => {
  const pairs = [pair('001'), pair('002'), pair('003')];
  const qs = buildCompareQuiz(pairs, { max: 6, rng: seeded(2) });
  assert.equal(qs.length, 6);
  for (const id of ['001', '002', '003']) assert.equal(qs.filter((q) => q.pairId === id).length, 2, id);
  assert.deepEqual(buildCompareQuiz([], { max: 30 }), []);
});

test('retryCompareQuiz() reshuffles prepared questions and keeps them answerable', () => {
  const qs = buildCompareQuiz([pair('051')], { rng: seeded(5) }).slice(0, 3);
  const again = retryCompareQuiz(qs, seeded(9));
  assert.equal(again.length, 3);
  for (const q of again) {
    assert.equal(q.pairId, '051');
    assert.deepEqual([...q.options].sort(), ['刚', '刚才']);
  }
});

test('pairsOfLetter() lists the groups of one letter; unknown letters and empty data give []', () => {
  const pts = sample();
  assert.deepEqual(pairsOfLetter('A', pts).map((p) => p.id), ['001', '002']);
  assert.deepEqual(pairsOfLetter('B', pts).map((p) => p.id), ['006']);
  assert.deepEqual(pairsOfLetter('Z', pts), []);
  assert.deepEqual(pairsOfLetter('', []), []);
});

test('filterPairs(), countPairs(), reviewPairs() and compareProgress() use c:<id> marks only', () => {
  const pts = sample();
  // old lesson-style keys, vocabulary marks and grammar marks must not count
  const getMark = marksOf({ 'c:001': 'k', 'c:002': 'r', 'c:1.1': 'k', 'c:1.2': 'r', 'g:1.3': 'k', 刚: 'r', 'g:006': 'k' });
  assert.deepEqual(filterPairs(pts, 'r', getMark).points.map((p) => p.id), ['002']);
  assert.deepEqual(filterPairs(pts, 'new', getMark).points.map((p) => p.id), ['006']);
  assert.deepEqual(countPairs(pts, getMark), { n: 3, k: 1, r: 1, fresh: 1 });
  assert.equal(filterPairs(pts, 'k', marksOf({})).fellBack, true);
  assert.deepEqual(reviewPairs(getMark, pts).map((p) => p.id), ['002']);
  assert.deepEqual(compareProgress(getMark, pts)('A'), { done: 1, total: 2 });
  assert.deepEqual(compareProgress(getMark, pts)('Z'), { done: 0, total: 0 });
});

test('loadCompareLetter() returns the saved letter only if it is still available', () => {
  const stub = (v) => ({ getItem: () => v, setItem() {} });
  assert.equal(withStorage(stub('B'), () => loadCompareLetter(['A', 'B'])), 'B');
  assert.equal(withStorage(stub('Q'), () => loadCompareLetter(['A', 'B'])), 'A', 'stale letter');
  assert.equal(withStorage(stub('<script>'), () => loadCompareLetter(['A', 'B'])), 'A', 'garbage');
  assert.equal(withStorage(stub(null), () => loadCompareLetter(['A', 'B'])), 'A', 'nothing saved');
  assert.equal(withStorage(stub('A'), () => loadCompareLetter([])), '', 'no data yet');
  const throwing = { getItem: () => { throw new Error('denied'); }, setItem() {} };
  assert.equal(withStorage(throwing, () => loadCompareLetter(['A', 'B'])), 'A', 'storage blocked');
});

test('pairIdFromHash() accepts known group ids and ignores everything else', () => {
  const byId = { '006': pair('006'), '096': pair('096') };
  assert.equal(pairIdFromHash('#096', byId), '096');
  assert.equal(pairIdFromHash('#006', byId), '006');
  for (const h of ['', '#', '#999', '#abc', '#1.1', '#%', '#%E0%A4%A', '#007']) assert.equal(pairIdFromHash(h, byId), null, JSON.stringify(h));
});

test('validateCompare() accepts a well-formed list and an empty one', () => {
  assert.deepEqual(validateCompare(sample()), []);
  assert.deepEqual(validateCompare([]), []);
  assert.deepEqual(validateCompare([pair('014', FIVE)]), []);
});

test('validateCompare() reports null groups and questions instead of throwing', () => {
  assert.ok(validateCompare([null, pair('002')]).some((e) => e.includes('phải là object')));
  const l = sample();
  l[0].questions[1] = null;
  assert.ok(validateCompare(l).some((e) => e.includes('câu 2: phải là object')));
});

test('validateCompare() reports each kind of problem', () => {
  const edit = (fn) => {
    const l = sample();
    fn(l);
    return validateCompare(l);
  };
  const has = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected "${text}" in ${JSON.stringify(errors)}`);
  has(validateCompare({}), 'phải là mảng');
  has(edit((l) => (l[0].id = '1.1')), 'id phải là 3 chữ số 001–125');
  has(edit((l) => (l[0].id = '126')), 'id phải là 3 chữ số 001–125');
  has(edit((l) => (l[1].id = '001')), 'id trùng: 001');
  has(validateCompare([pair('006'), pair('002')]), '002: id không tăng dần');
  has(edit((l) => (l[0].letter = 'B')), '001: letter phải là A');
  has(edit((l) => (l[0].words = [['刚', 'gāng']])), 'cần 2–5 từ');
  has(edit((l) => (l[0].words = [...FIVE, ['又', 'yòu']])), 'cần 2–5 từ');
  has(edit((l) => (l[0].words = [['刚', 'gāng'], ['刚', 'gāng']])), 'từ bị trùng');
  has(edit((l) => (l[0].words[1] = ['刚才'])), 'mỗi từ phải là [hán tự, pinyin]');
  has(edit((l) => (l[0].common = ' ')), 'thiếu common');
  has(edit((l) => (l[0].tip = '')), 'thiếu tip');
  has(edit((l) => (l[0].rows = [l[0].rows[0]])), 'cần ≥ 2 dòng so sánh');
  has(edit((l) => (l[0].rows[0] = ['Từ loại', 'x'])), 'dòng 1 phải có 3 ô');
  has(edit((l) => (l[0].examples[0] = ['我来。', 'py', 'vi'])), 'ví dụ 1 phải là [hán tự, pinyin, nghĩa, chỉ số từ]');
  has(edit((l) => (l[0].examples[0] = ['我来。', 'py', 'vi', 0])), 'ví dụ 1 không chứa 刚');
  has(edit((l) => (l[0].examples = l[0].examples.filter((x) => x[3] === 0))), '刚才 cần ≥ 2 ví dụ');
  has(edit((l) => (l[0].questions = l[0].questions.slice(0, 3))), 'cần 4–8 câu hỏi');
  has(edit((l) => (l[0].questions = [...l[0].questions, ...l[0].questions, ...l[0].questions])), 'cần 4–8 câu hỏi');
  has(validateCompare([{ ...pair('014', FIVE), questions: pair('014', FIVE).questions.slice(0, 4) }]), 'cần 5–8 câu hỏi');
  has(edit((l) => (l[0].questions[0].q = '他到了。')), 'câu 1: q phải có đúng một ___');
  has(edit((l) => (l[0].questions[0].answer = '刚刚')), 'câu 1: answer không phải từ của nhóm');
  has(edit((l) => (l[0].questions[1].explain = '')), 'câu 2: thiếu explain');
  has(edit((l) => l[0].questions.forEach((q) => (q.answer = '刚'))), '刚才 chưa là đáp án câu nào');
});

test('compare.json is valid, follows the book index and has no gaps', () => {
  assert.deepEqual(validateCompare(ALL_PAIRS), []);
  ALL_PAIRS.forEach((p, i) => {
    assert.equal(p.id, String(i + 1).padStart(3, '0'), 'groups are written in order, starting at 001, without gaps');
    assert.deepEqual(p.words.map((w) => w[0]), BOOK[i], `${p.id} words must match the book index`);
  });
});

test('compare.json has every group of the book', () => {
  assert.equal(ALL_PAIRS.length, TOTAL_PAIRS);
  assert.deepEqual(ALL_PAIRS.map((p) => p.id), BOOK.map((_, i) => String(i + 1).padStart(3, '0')));
});
