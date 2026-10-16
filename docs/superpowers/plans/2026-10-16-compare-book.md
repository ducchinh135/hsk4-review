# Từ dễ nhầm theo 125 nhóm của sách — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay chuyên mục `/compare` (16 nhóm tự soạn chia theo Bài 1–20) bằng 125 nhóm từ của sách, chia theo chữ cái A–Z, giữ nguyên tìm kiếm, bộ lọc, luyện tập, ôn nhóm "Cần ôn".

**Architecture:** `src/compare.js` đổi từ "nhóm theo bài" sang mảng phẳng 125 nhóm có `id` 3 chữ số và `letter`; dải chữ cái (`LetterTabs`) thay `LessonTabs`; trạng thái chữ đang chọn lưu `localStorage` riêng. Code đổi trước (Task 1–2), sau đó nội dung được soạn theo đợt chữ cái (Task 3–11), mỗi đợt một commit, `compare.test.mjs` kiểm tra dữ liệu bằng bảng mục lục sách.

**Tech Stack:** React 18 + Vite, `node --test` (`npm run test:unit`), Playwright MCP cho kiểm tra thủ công. Không đổi backend.

**Spec:** [docs/superpowers/specs/2026-10-16-compare-book-design.md](../specs/2026-10-16-compare-book-design.md) (thay phần nội dung/tổ chức của [2026-10-15-compare-design.md](../specs/2026-10-15-compare-design.md)). Đọc cả hai: spec mới không nhắc lại cơ chế đánh dấu, luyện tập, `ChoiceBlank`, `buildRoundRobin`.

## Global Constraints

- Mã nhóm là chuỗi 3 chữ số `"001"`–`"125"`, đúng số mục lục sách; khoá dấu là `c:<mã>` (≤ 12 ký tự).
- `compare.json` là **mảng phẳng** các nhóm, tăng dần theo `id`, không có khoảng trống (đợt nào soạn xong thì file dừng ở đó).
- Mỗi nhóm: `id`, `letter`, `words` (2–5 phần tử `[hán tự, pinyin]`), `common`, `rows` (≥ 2 dòng, mỗi dòng `1 + số từ` ô), `examples` (`[hán tự, pinyin, nghĩa, chỉ số từ]`, mỗi từ ≥ 2 ví dụ, câu chứa từ đó), `tip`, `questions` (từ `max(4, số từ)` đến 8 câu, đúng một `___`, `answer` thuộc `words`, mỗi từ là đáp án ít nhất một lần, có `explain`).
- Lựa chọn của câu hỏi luôn là các từ của nhóm; không lưu trong dữ liệu.
- Nội dung viết bằng tiếng Việt, **tự diễn đạt lại, không chép nguyên văn sách** (sách có bản quyền); đáp án cuối sách chỉ để kiểm tra.
- Chữ cái theo mục lục sách; giá trị `letter` phải khớp bảng `LETTER_RANGES` (xem Task 1).
- Không đổi: `vocab.json`, `grammar.json`, `quiz.js`, hook `useMarks`/`useAccount`/`useSpeech`, `server/`, `functions/`, `src/routes.js`, `src/App.jsx`, `ChoiceBlank`, `CompareNav`, `buildRoundRobin`.
- Không thêm dependency. Ứng dụng chưa có chế độ tối nên không thêm CSS tối.
- Commit kết thúc bằng dòng: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Chữ đang lưu trong `localStorage` đã không còn (rác, chữ chưa soạn, hoặc dữ liệu rỗng) → rơi về chữ đầu tiên (hoặc `''` khi chưa có dữ liệu), không lỗi. Test: Task 1 `loadCompareLetter`.
2. Link `/compare#<mã>` với mã lạ hoặc nhóm chưa soạn (vd. `#999`, `#abc`, `%`) → bỏ qua, trang hiện bình thường. Test: Task 1 `pairIdFromHash`.
3. Dấu cũ (`c:1.1`, dấu từ vựng `刚`, dấu ngữ pháp `g:1.1`) còn trong kho dấu → không tính vào tiến độ/đếm/ôn của nhóm mới. Test: Task 1 `filterPairs…`.
4. Nhóm 4–5 từ (vd. 别/别的/另/另外) → lượt luyện có đủ 4–5 lựa chọn, bảng đủ cột; câu hỏi tối thiểu bằng số từ. Test: Task 1 `buildCompareQuiz` (5 từ) và `validateCompare` (5 từ cần ≥ 5 câu).
5. Chưa có nhóm nào (`compare.json` = `[]`) → `LETTERS` rỗng, mọi trang hiện "đang soạn", không lỗi. Test: Task 1 `pairsOfLetter('')`, kiểm tra thủ công ở Task 2.

---

## File Structure

| File | Việc |
|---|---|
| `src/data/compare.json` | Mảng phẳng 125 nhóm (soạn dần) |
| `src/compare.js` | Logic thuần (không React): dữ liệu, chữ cái, bộ lọc, tìm kiếm, dựng lượt, kiểm tra dữ liệu |
| `src/components/LetterTabs.jsx` (mới) | Dải chữ cái dùng chung cho So sánh và Luyện tập |
| `src/components/ComparePair.jsx` | Thẻ nhóm: nhiều cột, hiển thị mã nhóm |
| `src/pages/ComparePage.jsx` | Trang So sánh theo chữ cái |
| `src/pages/ComparePracticePage.jsx` | Luyện tập theo chữ cái / ôn nhóm cần ôn |
| `src/styles.css` | Kiểu dải chữ cái, đổi tên `cp-lesson` → `cp-code` |
| `tests/compare.test.mjs` | Test logic và dữ liệu (kèm `BOOK` = mục lục 125 nhóm) |
| `README.md` | Mô tả chuyên mục và định dạng mới |

Ứng dụng **không chạy được giữa Task 1 và Task 2** (các trang còn import hàm đã bỏ); hai task nằm trên cùng một nhánh liên tiếp.

---

### Task 1: Logic, dữ liệu rỗng và test

**Files:**
- Modify: `src/compare.js` (viết lại toàn bộ)
- Modify: `src/data/compare.json` (thay bằng `[]`)
- Modify: `tests/compare.test.mjs` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `GRAMMAR_FILTERS`, `buildRoundRobin`, `countPoints`, `filterPoints`, `FILTER_NAMES` từ `src/grammar.js`; `shuffle` từ `src/random.js`.
- Produces (Task 2 dùng đúng các tên này, mọi chữ ký bên dưới là cố định):
  - `ALL_PAIRS: Pair[]`, `PAIR_BY_ID: Record<string, Pair>`, `TOTAL_PAIRS = 125`
  - `LETTER_RANGES: Record<string,[number,number]>`, `LETTER_ORDER: string[]`, `LETTERS: string[]` (chữ đã có nhóm, theo thứ tự)
  - `letterOf(id: string): string | undefined`
  - `pairsOfLetter(letter: string, pairs = ALL_PAIRS): Pair[]`
  - `compareKey(id): 'c:'+id`, `pairTitle(pair): string` (từ nối bằng ` / `)
  - `pairIdFromHash(hash: string, byId = PAIR_BY_ID): string | null`
  - `loadCompareLetter(letters = LETTERS): string`, `saveCompareLetter(letter: string): void`
  - `COMPARE_FILTERS`, `FILTER_NAMES`, `loadCompareFilter()`, `saveCompareFilter(f)` (như cũ)
  - `filterPairs(pairs, filter, getMark)`, `countPairs(pairs, getMark)` → `{ n, k, r, fresh }`, `reviewPairs(getMark, pairs = ALL_PAIRS)`
  - `compareProgress(getMark, pairs = ALL_PAIRS)(letter) → { done, total }`
  - `toneless(s)`, `searchPairs(query, pairs = ALL_PAIRS)`
  - `buildCompareQuiz(pairs, { max, rng })`, `retryCompareQuiz(questions, rng)`
  - `validateCompare(data): string[]` (không còn nhận `vocab`)
  - Bỏ hẳn: `COMPARE`, `pairsOf`, `lessonOf`.

- [ ] **Step 1: Viết lại test**

Thay toàn bộ `tests/compare.test.mjs` bằng:

```js
// Unit tests for the confusable-words logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PAIRS,
  LETTER_ORDER,
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
```

- [ ] **Step 2: Chạy test để thấy lỗi**

Run: `npm run test:unit 2>&1 | tail -30`
Expected: FAIL — `compare.test.mjs` báo lỗi import (`LETTER_ORDER`… không được export từ `src/compare.js`). Các test khác (quiz, router, grammar) vẫn qua.

- [ ] **Step 3: Viết lại `src/compare.js`**

Thay toàn bộ file bằng:

```js
// Confusable word groups (the 125 groups of the reference book) and their practice logic, with no
// React so Node tests can use them.
import RAW from './data/compare.json' with { type: 'json' };
import { GRAMMAR_FILTERS, buildRoundRobin, countPoints, filterPoints } from './grammar.js';
import { shuffle } from './random.js';

export { FILTER_NAMES } from './grammar.js';

// Every group written so far, in id order ("001" … "125").
export const ALL_PAIRS = RAW;
export const PAIR_BY_ID = Object.fromEntries(ALL_PAIRS.map((p) => [p.id, p]));
export const TOTAL_PAIRS = 125;

// Initial letter of the pinyin, as in the book's table of contents -> [first id, last id].
export const LETTER_RANGES = {
  A: [1, 5],
  B: [6, 23],
  C: [24, 30],
  D: [31, 41],
  E: [42, 43],
  F: [44, 49],
  G: [50, 52],
  H: [53, 56],
  J: [57, 67],
  K: [68, 71],
  L: [72, 74],
  M: [75, 81],
  N: [82, 87],
  O: [88, 88],
  P: [89, 90],
  Q: [91, 95],
  R: [96, 98],
  S: [99, 103],
  T: [104, 106],
  W: [107, 109],
  X: [110, 115],
  Y: [116, 119],
  Z: [120, 125],
};
export const LETTER_ORDER = Object.keys(LETTER_RANGES);
// Letters that have at least one group written.
export const LETTERS = LETTER_ORDER.filter((l) => ALL_PAIRS.some((p) => p.letter === l));

export function letterOf(id) {
  if (!/^\d{3}$/.test(id)) return undefined;
  const n = Number(id);
  return LETTER_ORDER.find((l) => n >= LETTER_RANGES[l][0] && n <= LETTER_RANGES[l][1]);
}

export const pairsOfLetter = (letter, pairs = ALL_PAIRS) => pairs.filter((p) => p.letter === letter);

// Group marks live in the vocabulary marks store; the prefix keeps them apart from hanzi and grammar.
export const compareKey = (id) => 'c:' + id;
export const pairTitle = (p) => p.words.map((w) => w[0]).join(' / ');

// The group named by a URL hash ("#096"), or null when it is not a group written so far.
export function pairIdFromHash(hash, byId = PAIR_BY_ID) {
  try {
    const id = decodeURIComponent(String(hash).replace(/^#/, ''));
    return Object.hasOwn(byId, id) ? id : null;
  } catch {
    return null;
  }
}

export const COMPARE_FILTERS = GRAMMAR_FILTERS;
const FILTER_KEY = 'hsk4_compare_filter';
const FILTER_IDS = GRAMMAR_FILTERS.map(([f]) => f);
const LETTER_KEY = 'hsk4_compare_letter';

export function loadCompareFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return FILTER_IDS.includes(f) ? f : 'all';
  } catch {
    return 'all';
  }
}

export function saveCompareFilter(f) {
  try {
    localStorage.setItem(FILTER_KEY, f);
  } catch {
    /* private mode / quota: the filter just isn't remembered */
  }
}

// The saved letter if it still has groups, else the first letter that does ('' when none is written yet).
export function loadCompareLetter(letters = LETTERS) {
  try {
    const l = localStorage.getItem(LETTER_KEY);
    if (letters.includes(l)) return l;
  } catch {
    /* private mode: fall through to the first letter */
  }
  return letters[0] || '';
}

export function saveCompareLetter(letter) {
  try {
    localStorage.setItem(LETTER_KEY, letter);
  } catch {
    /* private mode / quota: the letter just isn't remembered */
  }
}

export const filterPairs = (pairs, filter, getMark) => filterPoints(pairs, filter, getMark, compareKey);
export const countPairs = (pairs, getMark) => countPoints(pairs, getMark, compareKey);
export const reviewPairs = (getMark, pairs = ALL_PAIRS) => pairs.filter((p) => getMark(compareKey(p.id)) === 'r');

// For LetterTabs: known groups / groups of each letter.
export const compareProgress =
  (getMark, pairs = ALL_PAIRS) =>
  (letter) => {
    const c = countPairs(pairsOfLetter(letter, pairs), getMark);
    return { done: c.k, total: c.n };
  };

// Pinyin without tone marks, case, spaces or apostrophes ("Suǒ Yǒu" -> "suoyou", "lǜ" -> "lu").
export const toneless = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'’]/g, '')
    .toLowerCase();

// Groups with a word whose hanzi contains the query, or whose toneless pinyin contains it.
export function searchPairs(query, pairs = ALL_PAIRS) {
  const q = String(query).trim();
  if (!q) return [];
  const plain = toneless(q);
  if (!plain) return [];
  return pairs.filter((p) => p.words.some(([hz, py]) => hz.includes(q) || toneless(py).includes(plain)));
}

// The choices of a question are always the words of its group.
const withOptions = (p) => ({ id: p.id, questions: p.questions.map((q) => ({ ...q, options: p.words.map((w) => w[0]) })) });
const prepare = (q, pairId, rng) => ({ ...q, pairId, options: shuffle(q.options, rng) });

export const buildCompareQuiz = (pairs, opts = {}) => buildRoundRobin(pairs.map(withOptions), prepare, opts);

// The same questions again (e.g. the wrong ones), in a new order with the options reshuffled.
export const retryCompareQuiz = (questions, rng = Math.random) => shuffle(questions, rng).map((q) => prepare(q, q.pairId, rng));

// ---------- data checks (used by the tests) ----------

const isText = (s) => typeof s === 'string' && s.trim() !== '';
const MAX_QUESTIONS = 8;

function checkPair(p) {
  const e = [];
  const at = p.id;
  const words = Array.isArray(p.words) ? p.words : [];
  const hanzi = words.map((w) => (Array.isArray(w) ? w[0] : undefined));
  if (words.length < 2 || words.length > 5) e.push(`${at}: cần 2–5 từ`);
  if (!words.every((w) => Array.isArray(w) && w.length === 2 && w.every(isText))) e.push(`${at}: mỗi từ phải là [hán tự, pinyin]`);
  if (new Set(hanzi).size !== hanzi.length) e.push(`${at}: từ bị trùng`);
  for (const f of ['common', 'tip']) if (!isText(p[f])) e.push(`${at}: thiếu ${f}`);

  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (rows.length < 2) e.push(`${at}: cần ≥ 2 dòng so sánh`);
  rows.forEach((r, j) => {
    if (!Array.isArray(r) || r.length !== words.length + 1 || !r.every(isText)) e.push(`${at}: dòng ${j + 1} phải có ${words.length + 1} ô`);
  });

  const ex = Array.isArray(p.examples) ? p.examples : [];
  ex.forEach((x, j) => {
    const ok = Array.isArray(x) && x.length === 4 && x.slice(0, 3).every(isText) && Number.isInteger(x[3]) && isText(hanzi[x[3]]);
    if (!ok) e.push(`${at}: ví dụ ${j + 1} phải là [hán tự, pinyin, nghĩa, chỉ số từ]`);
    else if (!x[0].includes(hanzi[x[3]])) e.push(`${at}: ví dụ ${j + 1} không chứa ${hanzi[x[3]]}`);
  });
  hanzi.forEach((h, k) => {
    if (isText(h) && ex.filter((x) => Array.isArray(x) && x[3] === k).length < 2) e.push(`${at}: ${h} cần ≥ 2 ví dụ`);
  });

  const qs = Array.isArray(p.questions) ? p.questions : [];
  const minQuestions = Math.max(4, words.length);
  if (qs.length < minQuestions || qs.length > MAX_QUESTIONS) e.push(`${at}: cần ${minQuestions}–${MAX_QUESTIONS} câu hỏi`);
  qs.forEach((q, j) => {
    const qa = `${at} câu ${j + 1}`;
    if (!q || typeof q !== 'object') {
      e.push(`${qa}: phải là object`);
      return;
    }
    if (typeof q.q !== 'string' || q.q.split('___').length !== 2) e.push(`${qa}: q phải có đúng một ___`);
    if (!hanzi.includes(q.answer)) e.push(`${qa}: answer không phải từ của nhóm`);
    if (!isText(q.explain)) e.push(`${qa}: thiếu explain`);
  });
  hanzi.forEach((h) => {
    if (isText(h) && !qs.some((q) => q && q.answer === h)) e.push(`${at}: ${h} chưa là đáp án câu nào`);
  });
  return e;
}

// Every problem in the compare data, as readable messages; [] when it is valid.
export function validateCompare(data) {
  if (!Array.isArray(data)) return ['compare.json phải là mảng'];
  const errors = [];
  let prev = 0;
  data.forEach((p, i) => {
    if (!p || typeof p !== 'object') {
      errors.push(`[${i}]: phải là object`);
      return;
    }
    const n = /^\d{3}$/.test(p.id) ? Number(p.id) : 0;
    if (n < 1 || n > TOTAL_PAIRS) errors.push(`[${i}]: id phải là 3 chữ số 001–125, đang là ${JSON.stringify(p.id)}`);
    else if (n === prev) errors.push(`id trùng: ${p.id}`);
    else if (n < prev) errors.push(`${p.id}: id không tăng dần`);
    if (n) {
      prev = Math.max(prev, n);
      if (p.letter !== letterOf(p.id)) errors.push(`${p.id}: letter phải là ${letterOf(p.id)}`);
    }
    errors.push(...checkPair(p));
  });
  return errors;
}
```

- [ ] **Step 4: Thay dữ liệu bằng mảng rỗng**

Ghi `src/data/compare.json` với nội dung đúng một dòng:

```json
[]
```

- [ ] **Step 5: Chạy test**

Run: `npm run test:unit 2>&1 | tail -30`
Expected: PASS toàn bộ (quiz, router, grammar, compare). Nếu `Object.hasOwn` không có (Node < 16.9) hoặc `localStorage` stub không gán được thì xem lại `withStorage`, không sửa test cho yếu đi.

- [ ] **Step 6: Commit**

```bash
git add src/compare.js src/data/compare.json tests/compare.test.mjs
git commit -m "refactor(compare): group the confusable words by letter with 3-digit ids, empty data until the book is written

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Giao diện theo chữ cái và README

**Files:**
- Create: `src/components/LetterTabs.jsx`
- Modify: `src/pages/ComparePage.jsx` (viết lại toàn bộ)
- Modify: `src/pages/ComparePracticePage.jsx` (viết lại toàn bộ)
- Modify: `src/components/ComparePair.jsx` (3 chỗ)
- Modify: `src/styles.css:394-411` (khối `cp-*`) và thêm dải chữ cái
- Modify: `README.md` (dòng 12–15, 31–33, 48–49, 86–102)

**Interfaces:**
- Consumes: mọi thứ Task 1 "Produces"; `useApp()` trả `{ marks: { getMark, setMark, toggleMark, markRef }, speech, viewVersion }`; `Link` từ `../router.jsx`; `ChoiceBlank` (không đổi).
- Produces: `<LetterTabs letter getMark onSelect />`; `ComparePair` nhận prop `showLetter` (thay `lessonLabel`).

- [ ] **Step 1: Tạo `src/components/LetterTabs.jsx`**

```jsx
import { LETTERS, compareProgress } from '../compare.js';

// One tab per letter that has groups, with the known/total count of that letter. Scrolls sideways
// inside its own box on narrow screens.
export default function LetterTabs({ letter, getMark, onSelect }) {
  const count = compareProgress(getMark);
  return (
    <div className="letter-tabs" role="group" aria-label="Chữ cái đầu pinyin">
      {LETTERS.map((l) => {
        const { done, total } = count(l);
        return (
          <button key={l} type="button" className={'letter-tab' + (l === letter ? ' active' : '')} data-l={l} aria-pressed={l === letter} onClick={() => onSelect(l)}>
            <span className="letter-name">{l}</span>
            <span className="tab-sub">
              {done}/{total} ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Thay `src/pages/ComparePage.jsx`**

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import ComparePair from '../components/ComparePair.jsx';
import LetterTabs from '../components/LetterTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  COMPARE_FILTERS,
  LETTERS,
  PAIR_BY_ID,
  compareKey,
  countPairs,
  filterPairs,
  loadCompareFilter,
  loadCompareLetter,
  pairIdFromHash,
  pairsOfLetter,
  reviewPairs,
  saveCompareFilter,
  saveCompareLetter,
  searchPairs,
} from '../compare.js';
import { Link } from '../router.jsx';

// The confusable-word groups of the chosen letter, filtered by mark, or the search results over every
// group. A /compare#<id> link (from a practice run) switches to that group's letter, shows and opens
// it even if the filter hides it, and scrolls to it.
export default function ComparePage() {
  const { marks, speech, viewVersion } = useApp();
  const { getMark, toggleMark, markRef } = marks;
  const [initial] = useState(() => pairIdFromHash(window.location.hash));
  const [filter, setFilter] = useState(loadCompareFilter);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(initial);
  const [letter, setLetter] = useState(() => (initial ? PAIR_BY_ID[initial].letter : loadCompareLetter()));
  const [open, setOpen] = useState(() => new Set(initial ? [initial] : []));
  const scrolled = useRef(false);

  useEffect(() => {
    if (letter) saveCompareLetter(letter);
  }, [letter]);
  // navigate() has already scrolled to the top, so scroll once the target card is rendered.
  useEffect(() => {
    if (!target || scrolled.current) return;
    scrolled.current = true;
    document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, [target]);

  const all = useMemo(() => pairsOfLetter(letter), [letter]);
  // Rebuilt when the letter, filter or account data changes, not on every mark, so a card does not
  // vanish right after you mark it.
  const { points: pairs, fellBack } = useMemo(() => {
    const m = markRef.current;
    const res = filterPairs(all, filter, (k) => (m[k] && m[k].s) || '');
    if (target && !res.points.some((p) => p.id === target) && all.some((p) => p.id === target)) {
      return { points: all.filter((p) => p.id === target || res.points.includes(p)), fellBack: res.fellBack };
    }
    return res;
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, target, viewVersion]);

  const searching = query.trim() !== '';
  const results = useMemo(() => (searching ? searchPairs(query) : []), [searching, query]);

  const counts = countPairs(all, getMark);
  const n = { all: counts.n, new: counts.fresh, r: counts.r, k: counts.k };
  const reviewCount = reviewPairs(getMark).length;

  const pickFilter = (f) => {
    setFilter(f);
    saveCompareFilter(f);
    setTarget(null);
  };
  const pickLetter = (l) => {
    setTarget(null);
    setQuery('');
    setLetter(l);
  };
  const toggleOpen = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const card = (p, showLetter) => (
    <ComparePair
      key={p.id}
      pair={p}
      mark={getMark(compareKey(p.id))}
      open={open.has(p.id)}
      onToggleOpen={() => toggleOpen(p.id)}
      onMark={(s) => toggleMark(compareKey(p.id), s)}
      speech={speech}
      showLetter={showLetter}
    />
  );

  return (
    <div className="panel">
      {LETTERS.length > 0 && <LetterTabs letter={letter} getMark={getMark} onSelect={pickLetter} />}
      <div className="cp-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm từ trên cả 125 nhóm: 刚才, gangcai…"
          aria-label="Tìm nhóm từ"
        />
      </div>
      {searching ? (
        <>
          <div className="filter-note">
            {results.length ? `${results.length} nhóm khớp “${query.trim()}” trên mọi chữ cái` : 'Không tìm thấy nhóm nào.'}
          </div>
          <div className="grammar-list">{results.map((p) => card(p, true))}</div>
        </>
      ) : (
        <>
          {all.length > 0 && <div className="lesson-title">Chữ {letter}</div>}
          {all.length > 0 && (
            <div className="filter-bar">
              <div className="filter-chips" role="group" aria-label="Lọc nhóm từ theo trạng thái">
                {COMPARE_FILTERS.map(([f, label]) => (
                  <button key={f} type="button" className={'chip' + (f === filter ? ' active' : '')} onClick={() => pickFilter(f)}>
                    {label}
                    <span className="n">{n[f]}</span>
                  </button>
                ))}
              </div>
              {fellBack && <div className="audio-note filter-note">Chưa có nhóm nào ở mục này nên đang hiện cả chữ.</div>}
              <div className="filter-tools">
                <span>
                  Đã nắm {counts.k}/{counts.n} nhóm từ của chữ {letter}
                </span>
              </div>
            </div>
          )}
          <div className="grammar-actions">
            {all.length > 0 && (
              <Link to="/compare/practice" className="btn">
                📝 Luyện tập chữ này
              </Link>
            )}
            {reviewCount > 0 && (
              <Link to="/compare/review" className="btn secondary">
                🔁 Ôn các nhóm cần ôn ({reviewCount})
              </Link>
            )}
          </div>
          {all.length === 0 ? (
            <div className="grammar-empty">Nội dung đang được soạn.</div>
          ) : (
            <div className="grammar-list">{pairs.map((p) => card(p, false))}</div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Thay `src/pages/ComparePracticePage.jsx`**

Giữ nguyên thân của lượt luyện cũ; chỉ tách thành `PracticeRun` và để trang ngoài giữ chữ đang chọn. Thay toàn bộ file bằng:

```jsx
import { useState } from 'react';
import ChoiceBlank from '../components/ChoiceBlank.jsx';
import LetterTabs from '../components/LetterTabs.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  FILTER_NAMES,
  PAIR_BY_ID,
  buildCompareQuiz,
  compareKey,
  filterPairs,
  loadCompareFilter,
  loadCompareLetter,
  pairTitle,
  pairsOfLetter,
  retryCompareQuiz,
  reviewPairs,
  saveCompareLetter,
} from '../compare.js';
import { Link } from '../router.jsx';

const REVIEW_MAX = 30;
const compareLink = (id) => '/compare#' + id;

// A practice run over the chosen letter's groups (scope "lesson", under the compare filter) or over
// every "needs review" group (scope "review"). Picking another letter rebuilds the run.
export default function ComparePracticePage({ scope }) {
  const { marks } = useApp();
  const review = scope === 'review';
  const [letter, setLetter] = useState(loadCompareLetter);
  const pickLetter = (l) => {
    saveCompareLetter(l);
    setLetter(l);
  };
  return (
    <div className="panel">
      {!review && <LetterTabs letter={letter} getMark={marks.getMark} onSelect={pickLetter} />}
      <PracticeRun key={review ? 'review' : letter} scope={scope} letter={letter} />
    </div>
  );
}

// Every question of the chosen letter's groups under the compare filter, or of every "needs review"
// group, at most 30 questions. Built once on mount; the shell remounts the page (key = viewVersion)
// when account data changes, and the page above remounts this run when the letter changes.
function PracticeRun({ scope, letter }) {
  const { marks } = useApp();
  const { getMark, setMark, toggleMark } = marks;
  const review = scope === 'review';
  const max = review ? REVIEW_MAX : Infinity;

  const [source] = useState(() => {
    const filter = loadCompareFilter();
    const picked = review ? { points: reviewPairs(getMark), fellBack: false } : filterPairs(pairsOfLetter(letter), filter, getMark);
    return { ...picked, filter };
  });
  const fresh = (questions, run) => ({ questions, run, index: 0, answers: {}, showDone: false });
  const [state, setState] = useState(() => fresh(buildCompareQuiz(source.points, { max }), 0));
  const restart = (questions) => setState((s) => fresh(questions, s.run + 1));
  const go = (i) => setState((s) => ({ ...s, index: i, showDone: false }));
  const finish = () => setState((s) => ({ ...s, showDone: true }));

  const { questions, run, index, answers, showDone } = state;
  const n = questions.length;
  const answerList = Object.values(answers);
  const answeredCount = answerList.length;
  const score = answerList.filter((a) => a.ok).length;

  let body;
  if (!n) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">{review ? 'Chưa có nhóm từ nào cần ôn. 🎉' : 'Chưa có nhóm từ nào ở chữ này.'}</div>
        <div className="controls">
          <Link to="/compare" className="btn secondary">
            ⚖️ Về So sánh
          </Link>
        </div>
      </div>
    );
  } else if (showDone) {
    const wrongQs = questions.filter((_, i) => answers[i] && !answers[i].ok);
    const wrongIds = [...new Set(wrongQs.map((q) => q.pairId))];
    const runIds = [...new Set(questions.map((q) => q.pairId))];
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {n} (Đã làm {answeredCount} / {n} câu)
        </h2>
        {wrongIds.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Nhóm từ có câu sai</div>
            {wrongIds.map((id) => (
              <div key={id} className="quiz-reveal bad">
                <Link to={compareLink(id)}>⚖️ {pairTitle(PAIR_BY_ID[id])}</Link>
              </div>
            ))}
          </div>
        ) : answeredCount > 0 ? (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        ) : (
          <div className="filter-note">Bạn chưa trả lời câu nào.</div>
        )}
        {review && (
          <div className="grammar-review-marks">
            <div className="quiz-label">Đánh dấu “Đã nắm” để bỏ khỏi danh sách cần ôn</div>
            {runIds.map((id) => {
              const key = compareKey(id);
              return (
                <div key={id} className="grammar-review-row">
                  <span>{pairTitle(PAIR_BY_ID[id])}</span>
                  <button type="button" className={'mark-btn' + (getMark(key) === 'k' ? ' active' : '')} data-s="k" onClick={() => toggleMark(key, 'k')}>
                    ✅ Đã nắm
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="controls">
          {wrongQs.length > 0 && (
            <button className="btn" onClick={() => restart(retryCompareQuiz(wrongQs))}>
              🔁 Làm lại câu sai
            </button>
          )}
          <button className="btn" onClick={() => restart(buildCompareQuiz(source.points, { max }))}>
            🔀 Làm lượt mới
          </button>
          <Link to="/compare" className="btn secondary">
            ⚖️ Về So sánh
          </Link>
        </div>
      </div>
    );
  } else {
    const q = questions[index];
    const answered = answers[index] || null;
    const answer = (given) => {
      if (answered) return;
      const ok = given === q.answer;
      const key = compareKey(q.pairId);
      if (!ok && getMark(key) !== 'r') setMark(key, 'r');
      setState((s) => ({ ...s, answers: { ...s.answers, [index]: { given, ok } } }));
    };
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {n} · Chọn từ đúng điền vào chỗ trống
        </div>
        <ChoiceBlank key={run + ':' + index} q={q} answered={answered} onAnswer={answer} />
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            <div>{answered.ok ? '✅ Đúng' : '❌ Sai'}</div>
            <div className="quiz-reveal-sub">{q.explain}</div>
            <div className="quiz-reveal-sub">
              <Link to={compareLink(q.pairId)}>⚖️ Xem so sánh: {pairTitle(PAIR_BY_ID[q.pairId])}</Link>
            </div>
          </div>
        )}
        <div className="controls">
          <button className="btn secondary" onClick={() => go((index - 1 + n) % n)}>
            ◀ Câu trước
          </button>
          {index + 1 < n ? (
            <button key={'next' + index} className="btn" autoFocus={!!answered} onClick={() => go(index + 1)}>
              Câu tiếp ▶
            </button>
          ) : (
            <button key={'done' + index} className="btn" autoFocus={!!answered} onClick={finish}>
              Xem kết quả ▶
            </button>
          )}
          {answeredCount > 0 && index + 1 < n && (
            <button className="btn secondary" onClick={finish}>
              🏁 Kết quả ({score}/{answeredCount})
            </button>
          )}
        </div>
        <div className="fb-score">
          Đã làm: {answeredCount} / {n} · Đúng: {score}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="exercise-top">
        <Link to="/compare" className="link-btn">
          ← So sánh
        </Link>
        <span className="exercise-summary">
          {review ? 'Ôn các nhóm cần ôn' : `Chữ ${letter || '—'} · ${FILTER_NAMES[source.filter]}`} · {source.points.length} nhóm · {n} câu
        </span>
      </div>
      {source.fellBack && <div className="filter-note">Chưa có nhóm nào ở mục “{FILTER_NAMES[source.filter]}” nên đang luyện cả chữ.</div>}
      {body}
      {n > 0 && (
        <div className="question-grid-wrap">
          <div className="question-grid-header">
            <span className="quiz-label">Danh sách câu</span>
            <span className="question-grid-stat">
              Đã làm {answeredCount}/{n} (Đúng {score})
            </span>
          </div>
          <div className="question-grid">
            {questions.map((_, i) => {
              const a = answers[i];
              const cls = 'q-num' + (i === index && !showDone ? ' current' : '') + (a ? (a.ok ? ' correct' : ' wrong') : '');
              return (
                <button key={i} type="button" className={cls} onClick={() => go(i)} aria-label={`Câu ${i + 1}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Sửa `src/components/ComparePair.jsx`**

Ba thay đổi:

1. Comment và chữ ký hàm. Old:
```jsx
// is the group id, for /compare#1.3 links. `lessonLabel` is shown on search results.
export default function ComparePair({ pair, mark, open, onToggleOpen, onMark, speech, lessonLabel }) {
```
New:
```jsx
// is the group id, for /compare#096 links. The group number is shown on the title row, with its letter
// on search results (`showLetter`).
export default function ComparePair({ pair, mark, open, onToggleOpen, onMark, speech, showLetter }) {
```

2. Nhãn mã nhóm. Old:
```jsx
          {lessonLabel && <span className="cp-lesson">{lessonLabel}</span>}
```
New:
```jsx
          <span className="cp-code">{showLetter ? `${pair.letter} · ${pair.id}` : pair.id}</span>
```

3. Bảng nhiều cột (5 từ không bị bóp). Old:
```jsx
            <table className="cp-table">
```
New:
```jsx
            <table className="cp-table" style={{ minWidth: Math.max(420, 110 * (pair.words.length + 1)) }}>
```

- [ ] **Step 5: Sửa `src/styles.css`**

Dòng 402, old:
```css
.cp-lesson{ font-size:12px; font-weight:800; color:#555; background:#f0f0f5; border-radius:999px; padding:3px 8px; flex:0 0 auto; }
```
new:
```css
.cp-code{ font-size:12px; font-weight:800; color:#555; background:#f0f0f5; border-radius:999px; padding:3px 8px; flex:0 0 auto; }
```

Thêm ngay sau khối `.cp-tip{…}` (dòng 411):
```css
.letter-tabs{ display:flex; gap:8px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding:0 0 12px; max-width:100%; }
.letter-tab{ flex:0 0 auto; min-width:58px; display:flex; flex-direction:column; align-items:center; gap:2px; font:inherit; font-weight:800; padding:8px 12px; border:2px solid #d0d0d8; border-radius:14px; background:#fff; color:var(--ink); cursor:pointer; }
.letter-tab .letter-name{ font-size:18px; }
.letter-tab .tab-sub{ font-size:11px; font-weight:700; opacity:.8; }
.letter-tab.active{ background:var(--accent-a,#3d8bff); border-color:var(--accent-a,#3d8bff); color:#fff; }
```

- [ ] **Step 6: Sửa `README.md`**

a) Đoạn dòng 12–15, old:
```
A confusable-words section compares groups of 2-3 near-synonyms lesson by lesson (e.g. 刚 / 刚才,
以为 / 认为): what they share, a comparison table, examples per word with pronunciation and a tip,
plus a search over every lesson (hanzi or toneless pinyin) and fill-in-the-blank exercises whose
choices are the words of the group. Wrong answers mark the group "needs review".
```
new:
```
A confusable-words section compares the 125 groups of near-synonyms of a reference book, grouped by
the initial letter of their pinyin (e.g. 刚 / 刚才, 认为 / 以为, 别 / 别的 / 另 / 另外): what they
share, a comparison table, examples per word with pronunciation and a tip, plus a search over every
group (hanzi or toneless pinyin) and fill-in-the-blank exercises whose choices are the words of the
group. Wrong answers mark the group "needs review".
```

b) Dòng 31–32, old:
```
| `/compare` | Confusable-word groups of the chosen lesson, filtered by mark, with a search over every lesson; `/compare#1.3` opens and scrolls to a group |
| `/compare/practice` | A practice run over the chosen lesson's groups (under the compare filter) |
```
new:
```
| `/compare` | Confusable-word groups of the chosen letter, filtered by mark, with a search over every group; `/compare#096` opens and scrolls to a group |
| `/compare/practice` | A practice run over the chosen letter's groups (under the compare filter) |
```

c) Dòng 49, old:
```
| `src/data/compare.json` | Confusable-word groups per lesson (see below) |
```
new:
```
| `src/data/compare.json` | The confusable-word groups, as one flat list (see below) |
```

d) Mục "Confusable-words data" (từ `` `src/data/compare.json` maps a lesson key…`` đến hết đoạn `…every word an answer at least once).`), thay bằng:
````
`src/data/compare.json` is one flat list of groups in id order (`001` … `125`, the numbers of the
book's table of contents; written in batches, so the list may stop before 125). `letter` is the
initial of the pinyin as in the table of contents (the ranges live in `src/compare.js`).

```json
{
  "id": "096",
  "letter": "R",
  "words": [["认为", "rènwéi"], ["以为", "yǐwéi"]],
  "common": "…",
  "rows": [["Tiêu chí", "ô cho 认为", "ô cho 以为"]],
  "examples": [["中文。", "pīnyīn", "Nghĩa.", 0]],
  "tip": "…",
  "questions": [{ "q": "…___…", "answer": "以为", "explain": "…" }]
}
```

The last item of an example is the index of the word it shows. The choices of a question are the
group's words. Group marks are stored under `c:<id>`. `npm run test:unit` validates the file (2-5
words, ≥ 2 rows, ≥ 2 examples per word containing it, max(4, words) to 8 questions with one `___`,
every word an answer at least once, words equal to the book's index).
````

- [ ] **Step 7: Kiểm tra tự động**

Run: `npm run test:unit 2>&1 | tail -15 && npm run build 2>&1 | tail -15`
Expected: test PASS; build thành công không lỗi import (không còn `lessonOf`, `pairsOf`, `compareProgress` sai chữ ký).

- [ ] **Step 8: Kiểm tra thủ công với dữ liệu rỗng**

Chạy `npm run dev`, mở `/compare`, `/compare/practice`, `/compare/review` (Playwright hoặc trình duyệt). Expected: mỗi trang hiện "Nội dung đang được soạn." / "Chưa có nhóm từ nào ở chữ này.", không có dải chữ cái, không lỗi console; `/compare#999` và `/compare#1.1` không lỗi; các trang Từ vựng và Ngữ pháp vẫn hoạt động.

- [ ] **Step 9: Commit**

```bash
git add src/components/LetterTabs.jsx src/components/ComparePair.jsx src/pages/ComparePage.jsx src/pages/ComparePracticePage.jsx src/styles.css README.md
git commit -m "feat(compare): browse the groups by letter instead of lesson

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Quy trình soạn nội dung (dùng cho Task 3–11)

Dùng cho mọi đợt. Nguồn: `/Users/mac/Downloads/[Xixi]_So Sánh 125 Nhóm Từ Đồng Nghĩa, Gần Nghĩa Thường Gặp Trong Tiếng Hoa.pdf` (224 trang, scan ảnh, không có lớp chữ). **Số trang in trên sách trùng số trang PDF** (đã kiểm tra mục lục: trang in "5" là trang PDF 5). Thư mục làm việc tạm đặt trong scratchpad của phiên (`/private/tmp/claude-501/-Users-mac-Documents-dev-hsk/ba4ea970-ef1b-40f5-8e55-2e076e61145a/scratchpad/pdf/`), không đặt trong repo.

1. Render các trang của đợt: `pdftoppm -r 100 -jpeg -f <đầu> -l <cuối> "<đường dẫn pdf>" <thư mục>/p`, rồi đọc ảnh bằng công cụ Read. Đọc từng nhóm theo trang ghi trong mục lục (xem danh sách đợt bên dưới).
2. Với mỗi nhóm, soạn một đối tượng theo schema ở "Global Constraints", đặt vào `src/data/compare.json` ngay sau nhóm trước (đúng thứ tự `id`, `letter` theo `LETTER_RANGES`). `words` khớp từng chữ với `BOOK` trong `tests/compare.test.mjs` (từ biến thể như 刚刚, 不论, 没有 ghi trong `common` hoặc ô bảng, không đưa vào `words`). Pinyin có dấu thanh.
3. Nội dung tự viết lại bằng tiếng Việt: `common` (điểm giống), `rows` (3–5 tiêu chí so sánh: từ loại, vị trí trong câu, sắc thái, phạm vi, kết hợp…), `examples` (mỗi từ ≥ 2 câu tự đặt hoặc sửa lại, ngắn, dùng từ thông dụng; không chép nguyên câu của sách), `tip` (một câu), `questions` (`max(4, số từ)` đến 8 câu; mỗi câu chỉ một từ đúng; mỗi từ là đáp án ít nhất một lần; `explain` ngắn nêu lý do). Cách phân biệt chính theo sách, diễn đạt lại.
4. Đối chiếu câu hỏi của mình với phần **ĐÁP ÁN** của sách (từ trang 211) khi nhóm đó có bài tập; nếu mâu thuẫn thì xem lại cách dùng, không chép đáp án.
5. Chạy `npm run test:unit`; phải PASS (đặc biệt `compare.json is valid, follows the book index and has no gaps`).
6. Ghi các nhóm đã soạn vào commit; mỗi đợt đúng một commit.

Có thể giao các nhóm trong một đợt cho nhiều subagent soạn song song vào các file tạm rồi gộp vào `compare.json` theo thứ tự id; người gộp chạy test và đọc lại câu hỏi mơ hồ (câu có hai đáp án đúng thì sửa hoặc bỏ).

---

### Task 3: Đợt 1 — chữ A và B (001–023), kèm kiểm tra giao diện thật

**Files:**
- Modify: `src/data/compare.json` (thêm 23 nhóm)

Trang sách (từ mục lục): 001 tr.11 · 002 tr.12 · 003 tr.14 · 004 tr.15 · 005 tr.17 · 006 tr.18 · 007 tr.20 · 008 tr.21 · 009 tr.22 · 010 tr.24 · 011 tr.26 · 012 tr.28 · 013 tr.30 · 014 tr.32 · 015 tr.34 · 016 tr.36 · 017 tr.38 · 018 tr.39 · 019 tr.40 · 020 tr.42 · 021 tr.44 · 022 tr.45 · 023 tr.46; đợt dùng trang 11–47.

Các nhóm (khớp `BOOK`): 001 爱/喜欢 · 002 安静/平静/宁静 · 003 按/照 · 004 按照/依照 · 005 暗暗/悄悄/偷偷 · 006 帮/帮忙/帮助 · 007 宝贵/珍贵 · 008 抱歉/道歉 · 009 被/叫/让 · 010 本来/原来 · 011 比较/比/较 · 012 必定/必然/一定 · 013 必须/必需/必要 · 014 别/别的/另/另外 · 015 并/并且 · 016 不/没(没有) · 017 不必/不用 · 018 不但/不仅/不只 · 019 不得不/只得/只好 · 020 不见得/不一定 · 021 不然/否则 · 022 不由得/不禁 · 023 不在乎/无所谓.

- [ ] **Step 1: Xác nhận trang**

Render trang 11 (`-f 11 -l 11`) và đọc: phải thấy nhóm [001] 爱 / 喜欢. Nếu lệch trang thì tính độ lệch và dùng độ lệch đó cho mọi đợt (ghi lại trong commit).

- [ ] **Step 2: Soạn 23 nhóm theo "Quy trình soạn nội dung" (bước 1–4)**

- [ ] **Step 3: Chạy test**

Run: `npm run test:unit 2>&1 | tail -20`
Expected: PASS; `compare.json is valid…` xác nhận 23 nhóm, id `001`–`023`, `words` khớp `BOOK`.

- [ ] **Step 4: Kiểm tra thủ công giao diện (Playwright MCP, `npm run dev`)**

- `/compare` hiện dải chữ cái `A` `B` (chỉ hai chữ), chữ đầu tiên được chọn (xoá `hsk4_compare_letter` trước khi thử); tiến độ "0/5 ✓", "0/18 ✓".
- Mở thẻ nhóm 001: nghĩa chung, bảng, ví dụ chia theo từng từ có 🔊 và từ được tô đậm, mẹo, nút Đã nắm/Cần ôn; đánh dấu rồi đếm tiến độ đổi.
- Chuyển chữ B, F5: vẫn ở B. Nhóm 014 (4 từ) có đủ 5 cột bảng (1 tiêu chí + 4 từ), cuộn ngang trong thẻ ở 375px, trang không cuộn ngang.
- Tìm `bangmang` → thấy 006 ở chữ B với nhãn "B · 006"; xoá ô tìm → về chữ cũ. Tìm `'` → "Không tìm thấy nhóm nào".
- `/compare/practice` ở chữ B: làm sai một câu → nhóm đó thành "Cần ôn"; nhóm 014 có 4 nút lựa chọn; "Xem so sánh" → `/compare#014`, thẻ mở và cuộn tới. Đổi chữ ngay trên trang luyện tập → lượt mới của chữ đó.
- `/compare/review` hiện các nhóm Cần ôn; `/compare#999` và `/compare#1.1` không lỗi.
- Các trang Từ vựng và Ngữ pháp vẫn hoạt động; console không lỗi.
- Báo kết quả bằng chứng cụ thể (đã nhìn thấy gì), nếu có lỗi thì sửa rồi chạy lại cả test lẫn bước này.

- [ ] **Step 5: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 001-023 (letters A and B) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Đợt 2 — chữ C và D (024–041)

**Files:** Modify: `src/data/compare.json` (thêm 18 nhóm)

Trang sách: 024 tr.48 · 025 tr.50 · 026 tr.52 · 027 tr.54 · 028 tr.56 · 029 tr.57 · 030 tr.58 · 031 tr.60 · 032 tr.61 · 033 tr.62 · 034 tr.64 · 035 tr.66 · 036 tr.67 · 037 tr.70 · 038 tr.74 · 039 tr.75 · 040 tr.78 · 041 tr.80; đợt dùng trang 48–80.

Nhóm: 024 曾经/曾/已经 · 025 差不多/差点儿/几乎 · 026 常/常常/往往/经常 · 027 朝/向/往 · 028 处处/到处 · 029 从不/从未 · 030 从前/以前 · 031 答复/回答 · 032 大半/大都/多半 · 033 大概/大约 · 034 但/但是/可是/不过 · 035 当中/其中 · 036 到底/毕竟/究竟/终于 · 037 的/得/地 · 038 的确/确实 · 039 懂/了解/明白/知道 · 040 对/对于/关于 · 041 多少/几.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4 cho đợt này (037 là nhóm ba chữ đơn: ví dụ phải chứa đúng chữ 的/得/地; câu hỏi chọn chữ đúng).
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`041`).
- [ ] **Step 3:** Mở `/compare` chữ C và D bằng trình duyệt: dải chữ cái có thêm `C` `D`, nhóm 4 từ (026, 034, 036, 039) hiển thị đủ cột và đủ nút luyện; không lỗi console.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 024-041 (letters C and D) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Đợt 3 — chữ E, F, G, H (042–056)

**Files:** Modify: `src/data/compare.json` (thêm 15 nhóm)

Trang sách: 042 tr.81 · 043 tr.82 · 044 tr.84 · 045 tr.85 · 046 tr.86 · 047 tr.88 · 048 tr.89 · 049 tr.91 · 050 tr.94 · 051 tr.95 · 052 tr.96 · 053 tr.99 · 054 tr.101 · 055 tr.102 · 056 tr.103; đợt dùng trang 81–104.

Nhóm: 042 而且/并且 · 043 二/两 · 044 发达/发展 · 045 反而/相反 · 046 返/回 · 047 房间/房子/房屋/屋子 · 048 仿佛/好像/似乎 · 049 非常/很/挺/十分/极 · 050 赶紧/赶快 · 051 刚/刚才 (刚刚 ghi trong `common`) · 052 跟/和/及/与 · 053 还/再/又 · 054 还是/或者 · 055 好不容易/很不容易 (sách ghi 好(不)容易; ghi 好容易 trong `common`) · 056 忽然/突然/猛然.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4. Nhóm 049 có 5 từ: cần ≥ 5 câu hỏi, mỗi từ làm đáp án ít nhất một lần.
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`056`).
- [ ] **Step 3:** Mở `/compare` chữ F và nhóm 049 (5 từ): bảng 6 cột cuộn ngang trong thẻ, trang không cuộn ngang ở 375px; luyện tập chữ F có 5 nút lựa chọn.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 042-056 (letters E to H) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Đợt 4 — chữ J và K (057–071)

**Files:** Modify: `src/data/compare.json` (thêm 15 nhóm)

Trang sách: 057 tr.105 · 058 tr.107 · 059 tr.108 · 060 tr.110 · 061 tr.111 · 062 tr.112 · 063 tr.114 · 064 tr.116 · 065 tr.118 · 066 tr.120 · 067 tr.121 · 068 tr.123 · 069 tr.124 · 070 tr.126 · 071 tr.127; đợt dùng trang 105–129.

Nhóm: 057 急忙/连忙/匆忙 · 058 急忙/连忙/赶忙 · 059 既/既然 · 060 将来/未来 · 061 讲/说/谈 · 062 尽管/即使/虽然 · 063 经历/经过/通过 · 064 净/老是/总/总是 · 065 竟/竟然/不料/居然 · 066 据说/听说 · 067 决定/决心 · 068 开始/起初/最初/当初 · 069 看/看见 · 070 看来/看起来/看样子/看上去 · 071 靠/凭.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4. 057 và 058 là hai nhóm riêng của sách (cùng có 急忙/连忙, khác từ thứ ba: 匆忙 và 赶忙): soạn riêng, câu hỏi chỉ dùng câu mà từ thứ ba là đáp án duy nhất đúng.
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`071`).
- [ ] **Step 3:** Mở `/compare` chữ J và K, tìm `jimang` ra cả 057 và 058; không lỗi console.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 057-071 (letters J and K) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Đợt 5 — chữ L, M, N (072–087)

**Files:** Modify: `src/data/compare.json` (thêm 16 nhóm)

Trang sách: 072 tr.130 · 073 tr.131 · 074 tr.132 · 075 tr.133 · 076 tr.135 · 077 tr.137 · 078 tr.138 · 079 tr.139 · 080 tr.141 · 081 tr.142 · 082 tr.143 · 083 tr.145 · 084 tr.146 · 085 tr.147 · 086 tr.149 · 087 tr.150; đợt dùng trang 130–151.

Nhóm: 072 留念/纪念 · 073 流传/流行/传播 · 074 旅行/旅游/游览 · 075 马上/立刻/顿时 · 076 买卖/生意/贸易/交易 · 077 满意/满足 · 078 没关系/没什么/没事儿 · 079 每/各 · 080 美丽/漂亮/好看 · 081 免得/省得 · 082 那/那么 · 083 难怪/怪不得 · 084 难过/难受 · 085 难免/不免 · 086 难为/为难 · 087 年纪/年龄/岁数/岁.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4.
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`087`).
- [ ] **Step 3:** Mở `/compare` chữ N, nhóm 087 (có từ `岁` là một phần của `岁数`): từ tô đậm trong ví dụ không làm vỡ câu; không lỗi console.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 072-087 (letters L to N) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Đợt 6 — chữ O, P, Q, R (088–098)

**Files:** Modify: `src/data/compare.json` (thêm 11 nhóm)

Trang sách: 088 tr.152 · 089 tr.153 · 090 tr.155 · 091 tr.156 · 092 tr.157 · 093 tr.159 · 094 tr.161 · 095 tr.162 · 096 tr.163 · 097 tr.165 · 098 tr.167; đợt dùng trang 152–167.

Nhóm: 088 偶尔/偶然 · 089 怕/恐怕 · 090 偏/偏偏 · 091 其实/实际上 · 092 恰好/恰巧/正好 · 093 千万/万万/一定 · 094 亲身/亲自 · 095 全部/所有/一切 · 096 认为/以为 · 097 仍/仍然/依然/还是 · 098 仍旧/依旧.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4.
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`098`).
- [ ] **Step 3:** Mở `/compare#096`: đúng chữ R, thẻ mở sẵn và cuộn tới; không lỗi console.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 088-098 (letters O to R) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Đợt 7 — chữ S và T (099–106)

**Files:** Modify: `src/data/compare.json` (thêm 8 nhóm)

Trang sách: 099 tr.168 · 100 tr.169 · 101 tr.171 · 102 tr.172 · 103 tr.173 · 104 tr.176 · 105 tr.178 · 106 tr.179; đợt dùng trang 168–181.

Nhóm: 099 稍稍/稍微/稍 · 100 似/像 · 101 舒服/舒适 · 102 虽/虽然/虽说/别看 · 103 随/随着/跟 · 104 特别/特地/特意 · 105 疼/痛 · 106 同样/一般/一样.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4.
- [ ] **Step 2:** `npm run test:unit 2>&1 | tail -20` → PASS (id liên tục `001`–`106`).
- [ ] **Step 3:** Mở `/compare` chữ S và T; không lỗi console.
- [ ] **Step 4: Commit**

```bash
git add src/data/compare.json
git commit -m "feat(compare): groups 099-106 (letters S and T) from the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Đợt 8 — chữ W, X, Y, Z (107–125), hoàn tất 125 nhóm

**Files:**
- Modify: `src/data/compare.json` (thêm 19 nhóm)
- Modify: `tests/compare.test.mjs` (thêm test "đủ 125 nhóm")

Trang sách: 107 tr.182 · 108 tr.183 · 109 tr.184 · 110 tr.185 · 111 tr.187 · 112 tr.188 · 113 tr.190 · 114 tr.192 · 115 tr.193 · 116 tr.195 · 117 tr.198 · 118 tr.199 · 119 tr.201 · 120 tr.202 · 121 tr.203 · 122 tr.206 · 123 tr.207 · 124 tr.208 · 125 tr.209; đợt dùng trang 182–210.

Nhóm: 107 为/为了 · 108 无论/不管 (sách ghi 无论(不论); ghi 不论 trong `common`) · 109 无论/无论如何/不管 · 110 喜欢/喜爱 · 111 细心/仔细/小心 · 112 先后/前后 · 113 向来/一向/一直/从来 · 114 谢谢/感谢/感激 · 115 幸亏/多亏 · 116 以后/之后/以来/后/后来 · 117 因此/因而/因为/由于 · 118 拥有/有 · 119 于是/所以 · 120 再三/一再 · 121 怎么/怎么样/怎样 · 122 至多/最多 · 123 至少/最少 · 124 终于/最后 · 125 最近/近来.

- [ ] **Step 1:** Làm theo "Quy trình soạn nội dung" bước 1–4 (116 có 5 từ: ≥ 5 câu hỏi).
- [ ] **Step 2: Thêm test đủ 125 nhóm**

Cuối `tests/compare.test.mjs` thêm:

```js
test('compare.json has every group of the book', () => {
  assert.equal(ALL_PAIRS.length, TOTAL_PAIRS);
  assert.deepEqual(ALL_PAIRS.map((p) => p.id), BOOK.map((_, i) => String(i + 1).padStart(3, '0')));
});
```

- [ ] **Step 3:** `npm run test:unit 2>&1 | tail -20` → PASS, và `npm run build 2>&1 | tail -10` thành công.
- [ ] **Step 4: Kiểm tra thủ công toàn bộ**

`npm run dev`: dải chữ cái đủ 23 chữ (A B C D E F G H J K L M N O P Q R S T W X Y Z), tổng tiến độ đúng; tìm `yizhi` ra 113 (và các nhóm khác chứa 一直 như 004? — theo dữ liệu thật); `/compare/review` với nhóm của chữ khác chuyển chữ đúng khi bấm "Xem so sánh"; ở 375px không cuộn ngang trang; F5 và Back/Forward đúng; đồng bộ dấu qua tài khoản đăng nhập vẫn hoạt động (đánh dấu rồi tải lại); ghi `c:125` không bị API từ chối (khoá ≤ 12 ký tự).

- [ ] **Step 5: Commit**

```bash
git add src/data/compare.json tests/compare.test.mjs
git commit -m "feat(compare): groups 107-125 (letters W to Z); all 125 groups of the book

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (spec 2026-10-16 §):
- §1 mục tiêu/quyết định: dữ liệu 125 nhóm, chữ cái, mã, 2–5 từ, khoá `c:`, `hsk4_compare_letter` → Task 1–2; nội dung tự viết → Quy trình + Task 3–10.
- §2 schema, bảng chữ cái: Task 1 (`LETTER_RANGES`, `validateCompare`, `BOOK`).
- §3 giao diện: dải chữ cái, tìm kiếm 125 nhóm với nhãn "R · 096", bộ lọc theo chữ, thẻ nhiều cột + mã, link `#<mã>` đổi chữ, nút "Luyện tập chữ này", trang luyện/ôn → Task 2; "đang soạn" → Task 2 step 8.
- §4 mã nguồn: bảng file khớp File Structure; `routes.js`/`App.jsx` không đổi (đã kiểm tra: `App.jsx` chỉ truyền `scope` và `key`).
- §5 kiểm thử: logic + dữ liệu → Task 1; thủ công → Task 2 step 8, Task 3 step 4, Task 10 step 4.
- §6 kế hoạch nội dung: Task 3–10 (đợt chia theo chữ cái; spec liệt kê C–D, E–H, J–K, L–N, O–R, S–T, W–Z khớp).
- Dấu cũ không đọc: test "c:1.1 không tính" ở Task 1.

**Placeholder scan:** các task nội dung dùng quy trình chung vì nội dung là dữ liệu phải đọc từ sách; mỗi task nêu rõ id, từ, trang, lệnh test và commit. Không còn TBD.

**Type consistency:** tên dùng ở Task 2 (`LETTERS`, `pairsOfLetter`, `pairIdFromHash`, `loadCompareLetter`, `saveCompareLetter`, `compareProgress(getMark)`, `showLetter`, `cp-code`) đều khai báo ở Task 1 hoặc Task 2. `reviewPairs(getMark)` gọi với một đối số (mặc định `ALL_PAIRS`).

**Review Focus:** 5 dòng đã gắn test (Task 1) và bước thủ công (Task 2/3).
