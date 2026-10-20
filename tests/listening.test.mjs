// Unit tests for the listening logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import RAW from '../src/data/listening.json' with { type: 'json' };
import { buildMix, buildRun, correctLabel, keyAction, listenKey, mixSize, partFormat, promptOf, reviewQuestions, validateListening } from '../src/listening.js';

const q = (id, type, answer = true) => ({
  id,
  type,
  voice: 'f',
  text: '我们明天去公园玩儿。',
  pinyin: 'Wǒmen míngtiān qù gōngyuán wánr.',
  vi: 'Ngày mai chúng tôi đi công viên chơi.',
  statement: '他们今天去公园。',
  statementPinyin: 'Tāmen jīntiān qù gōngyuán.',
  statementVi: 'Hôm nay họ đi công viên.',
  answer,
  explain: '明天 = ngày mai, không phải hôm nay.',
});

// A minimal valid data object holding the given questions.
const dataWith = (questions) => ({
  parts: [
    {
      id: 'p1',
      format: 'truefalse',
      name: '判断对错',
      label: 'Phán đoán đúng/sai',
      desc: 'x',
      tips: { intro: '', sections: [] },
      types: [
        { id: 'detail', icon: '🔢', name: 'Chi tiết', desc: 'x', tip: '' },
        { id: 'attitude', icon: '💬', name: 'Thái độ', desc: 'x', tip: '' },
        { id: 'infer', icon: '🧠', name: 'Suy luận', desc: 'x', tip: '' },
      ],
      questions,
    },
  ],
});

const part = (...counts) => ({
  types: counts.map((_, i) => ({ id: 't' + i })),
  questions: counts.flatMap((n, i) => Array.from({ length: n }, (_, j) => ({ ...q(`p1-${i}${String(j).padStart(2, '0')}`, 't' + i), id: `t${i}-${j}` }))),
});

const noErrors = (data) => validateListening(data);
const errorFor = (data, id) => validateListening(data).some((e) => e.includes(id));

test('the shipped listening.json is valid', () => {
  assert.deepEqual(validateListening(RAW), []);
});

test('validateListening() accepts a valid question set', () => {
  assert.deepEqual(noErrors(dataWith([q('p1-001', 'detail', true), q('p1-002', 'detail', false)])), []);
});

test('validateListening() reports a malformed id', () => {
  assert.ok(errorFor(dataWith([q('p1-7', 'detail')]), 'p1-7'));
});

test('validateListening() reports a duplicate id', () => {
  const e = validateListening(dataWith([q('p1-001', 'detail', true), q('p1-001', 'detail', false)]));
  assert.ok(e.some((m) => m.includes('p1-001') && m.includes('trùng')));
});

test('validateListening() reports a type that is not in types', () => {
  assert.ok(errorFor(dataWith([q('p1-001', 'nope')]), 'p1-001'));
});

test('validateListening() reports a non-boolean answer', () => {
  assert.ok(errorFor(dataWith([{ ...q('p1-001', 'detail'), answer: 'false' }]), 'p1-001'));
});

test('validateListening() reports a voice other than f or m', () => {
  assert.ok(errorFor(dataWith([{ ...q('p1-001', 'detail'), voice: 'x' }]), 'p1-001'));
});

test('validateListening() reports each missing or empty text field', () => {
  for (const f of ['text', 'pinyin', 'vi', 'statement', 'statementPinyin', 'statementVi', 'explain']) {
    assert.ok(errorFor(dataWith([{ ...q('p1-001', 'detail'), [f]: '' }]), 'p1-001'), f + ' empty');
    const { [f]: _gone, ...rest } = q('p1-001', 'detail');
    assert.ok(errorFor(dataWith([rest]), 'p1-001'), f + ' missing');
  }
});

test('validateListening() reports a type whose questions all share one answer', () => {
  const e = validateListening(dataWith([q('p1-001', 'detail', true), q('p1-002', 'detail', true)]));
  assert.ok(e.some((m) => m.includes('detail')));
});

test('a type with a single question is not flagged for its answer', () => {
  assert.deepEqual(validateListening(dataWith([q('p1-001', 'detail', true)])), []);
});

test('listenKey() prefixes the id and fits the 12-character sync limit', () => {
  assert.equal(listenKey('p1-007'), 'l:p1-007');
  assert.ok(listenKey('p1-007').length <= 12);
});

test('buildMix() skips types with no questions and never repeats a question', () => {
  const p = part(5, 5, 0);
  const run = buildMix(p, 10);
  assert.equal(run.length, 10);
  assert.equal(new Set(run.map((x) => x.id)).size, 10);
  assert.ok(run.every((x) => x.type !== 't2'));
});

test('buildMix() returns every question when fewer exist than asked for', () => {
  assert.equal(buildMix(part(2, 2), 10).length, 4);
});

test('buildMix() returns [] for a part with no questions', () => {
  assert.deepEqual(buildMix(part(0, 0, 0), 10), []);
});

test('buildMix() takes an equal share from each type that has enough', () => {
  const run = buildMix(part(5, 5), 4);
  const per = (t) => run.filter((x) => x.type === t).length;
  assert.equal(per('t0'), 2);
  assert.equal(per('t1'), 2);
});

test('buildRun() keeps max questions drawn from the input', () => {
  const qs = part(6).questions;
  const run = buildRun(qs, { max: 3 });
  assert.equal(run.length, 3);
  assert.ok(run.every((x) => qs.some((y) => y.id === x.id)));
});

test('buildRun() without max keeps every question once', () => {
  const qs = part(6).questions;
  assert.deepEqual(buildRun(qs).map((x) => x.id).sort(), qs.map((x) => x.id).sort());
});

test('reviewQuestions() returns only the questions marked "r", in id order', () => {
  const p = { questions: [q('p1-003', 'detail'), q('p1-001', 'detail'), q('p1-002', 'detail')] };
  const marks = { 'l:p1-002': 'r', 'l:p1-003': 'r', 'l:p1-001': 'k' };
  assert.deepEqual(reviewQuestions((k) => marks[k] || '', p).map((x) => x.id), ['p1-002', 'p1-003']);
});

test('every question has an mp3 in public/audio/listening', () => {
  for (const part of RAW.parts) {
    for (const { id } of part.questions) {
      const file = fileURLToPath(new URL(`../public/audio/listening/${id}.mp3`, import.meta.url));
      assert.ok(existsSync(file) && statSync(file).size > 1000, `${id}.mp3 missing or too small`);
    }
  }
});

test('keyAction() answers with 1/← (对) and 2/→ (错) before the question is answered', () => {
  for (const key of ['1', 'ArrowLeft']) assert.equal(keyAction({ key, answered: false, target: 'other' }), 'true');
  for (const key of ['2', 'ArrowRight']) assert.equal(keyAction({ key, answered: false, target: 'other' }), 'false');
  assert.equal(keyAction({ key: 'Enter', answered: false, target: 'other' }), null);
});

test('keyAction() goes to the next question with Enter after answering, also right after clicking an answer button', () => {
  assert.equal(keyAction({ key: 'Enter', answered: true, target: 'other' }), 'next');
  assert.equal(keyAction({ key: 'Enter', answered: true, target: 'answer' }), 'next');
});

test('keyAction() leaves Enter to a focused control such as "Câu trước" and ignores answer keys once answered', () => {
  assert.equal(keyAction({ key: 'Enter', answered: true, target: 'control' }), null);
  assert.equal(keyAction({ key: '1', answered: true, target: 'other' }), null);
});

test('keyAction() ignores every key while typing in a field', () => {
  for (const key of ['1', '2', 'ArrowLeft', 'ArrowRight', 'Enter']) {
    for (const answered of [false, true]) assert.equal(keyAction({ key, answered, target: 'field' }), null, key);
  }
});

// ---- Part 2 style (format "choice") ----
const opt = (text) => ({ text, pinyin: 'pinyin ' + text, vi: 'nghĩa ' + text });
const choiceQ = (id, type, answer = 0, over = {}) => ({
  id,
  type,
  lines: [
    { v: 'm', text: '你几点下班？', pinyin: 'Nǐ jǐ diǎn xiàbān?', vi: 'Mấy giờ cậu tan làm?' },
    { v: 'f', text: '大概七点。', pinyin: 'Dàgài qī diǎn.', vi: 'Khoảng bảy giờ.' },
  ],
  question: { v: 'f', text: '女的几点下班？', pinyin: 'Nǚ de jǐ diǎn xiàbān?', vi: 'Người nữ mấy giờ tan làm?' },
  options: [opt('五点'), opt('六点'), opt('七点'), opt('八点')],
  answer,
  explain: '大概七点 = khoảng bảy giờ.',
  ...over,
});
const dataWithChoice = (questions) => ({
  parts: [
    {
      id: 'p2',
      format: 'choice',
      name: '选择正确答案',
      label: 'Chọn đáp án đúng',
      desc: 'x',
      mixCount: 15,
      tips: { intro: '', sections: [] },
      types: [
        { id: 'detail', icon: '🔎', name: 'Chi tiết', desc: 'x', tip: '' },
        { id: 'reason', icon: '❓', name: 'Nguyên nhân', desc: 'x', tip: '' },
      ],
      questions,
    },
  ],
});
const goodPair = () => [choiceQ('p2-001', 'detail', 2), choiceQ('p2-002', 'detail', 1)];
const choiceErrors = (over, id = 'p2-001') => validateListening(dataWithChoice([choiceQ(id, 'detail', 2, over), choiceQ('p2-002', 'detail', 1)]));
const mentions = (errors, id) => errors.some((e) => e.includes(id));

test('validateListening() accepts valid choice questions and the shipped data keeps passing', () => {
  assert.deepEqual(validateListening(dataWithChoice(goodPair())), []);
  assert.deepEqual(validateListening(RAW), []);
});

test('validateListening() rejects a part without a known format', () => {
  const d = dataWith([q('p1-001', 'detail', true), q('p1-002', 'detail', false)]);
  delete d.parts[0].format;
  assert.ok(validateListening(d).some((e) => e.includes('format')));
  d.parts[0].format = 'nope';
  assert.ok(validateListening(d).some((e) => e.includes('format')));
});

test('validateListening() reports a choice answer outside 0-3 or not an integer', () => {
  for (const answer of [4, -1, '2', 1.5, null]) assert.ok(mentions(choiceErrors({ answer }), 'p2-001'), String(answer));
});

test('validateListening() reports duplicate, missing or incomplete options', () => {
  assert.ok(mentions(choiceErrors({ options: [opt('五点'), opt('五点'), opt('七点'), opt('八点')] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ options: [opt('五点'), opt('六点'), opt('七点')] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ options: [opt('五点'), opt('六点'), opt('七点'), opt('八点'), opt('九点')] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ options: [opt('五点'), { ...opt('六点'), pinyin: '' }, opt('七点'), opt('八点')] }), 'p2-001'));
  const noVi = { ...opt('六点') };
  delete noVi.vi;
  assert.ok(mentions(choiceErrors({ options: [opt('五点'), noVi, opt('七点'), opt('八点')] }), 'p2-001'));
});

test('validateListening() reports a dialogue that is not exactly two lines, or a bad voice', () => {
  const [a, b] = choiceQ('x', 'detail').lines;
  assert.ok(mentions(choiceErrors({ lines: [a] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ lines: [a, b, a] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ lines: [{ ...a, v: 'x' }, b] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ lines: [a, { ...b, text: '' }] }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ question: { v: 'x', text: '？', pinyin: 'p', vi: 'v' } }), 'p2-001'));
  assert.ok(mentions(choiceErrors({ question: { v: 'f', text: '', pinyin: 'p', vi: 'v' } }), 'p2-001'));
});

test('validateListening() reports an id from another part, a duplicate id and an unknown type', () => {
  assert.ok(mentions(choiceErrors({}, 'p1-001'), 'p1-001'));
  const dup = validateListening(dataWithChoice([choiceQ('p2-001', 'detail', 0), choiceQ('p2-001', 'detail', 1)]));
  assert.ok(dup.some((e) => e.includes('p2-001') && e.includes('trùng')));
  assert.ok(mentions(validateListening(dataWithChoice([choiceQ('p2-001', 'nope', 0)])), 'p2-001'));
});

test('validateListening() reports a choice type whose correct answers all share one letter', () => {
  const e = validateListening(dataWithChoice([choiceQ('p2-001', 'detail', 2), choiceQ('p2-002', 'detail', 2)]));
  assert.ok(e.some((m) => m.includes('detail')));
});

test('partFormat(), mixSize(), correctLabel() and promptOf() follow the part format', () => {
  const tf = dataWith([q('p1-001', 'detail')]).parts[0];
  const ch = dataWithChoice(goodPair()).parts[0];
  assert.equal(partFormat(tf), 'truefalse');
  assert.equal(partFormat(ch), 'choice');
  assert.equal(mixSize(ch), 15);
  assert.equal(mixSize(tf), 10);
  assert.equal(mixSize({ mixCount: 7 }), 7);
  assert.equal(correctLabel(tf, q('p1-001', 'detail', true)), '对');
  assert.equal(correctLabel(tf, q('p1-002', 'detail', false)), '错');
  assert.equal(correctLabel(ch, ch.questions[0]), 'C. 七点');
  assert.equal(promptOf(tf, tf.questions[0]), '他们今天去公园。');
  assert.equal(promptOf(ch, ch.questions[0]), '女的几点下班？');
});

test('keyAction() for choice questions: 1-4 and a-d choose, Enter moves on, fields are ignored', () => {
  const f = (key, answered = false, target = 'other') => keyAction({ key, answered, target, format: 'choice' });
  assert.equal(f('1'), 'choose:0');
  assert.equal(f('4'), 'choose:3');
  assert.equal(f('a'), 'choose:0');
  assert.equal(f('D'), 'choose:3');
  assert.equal(f('b'), 'choose:1');
  for (const key of ['5', '0', 'e', 'ArrowLeft', 'ArrowRight', 'Enter']) assert.equal(f(key), null, key);
  assert.equal(f('Enter', true, 'answer'), 'next');
  assert.equal(f('Enter', true, 'other'), 'next');
  assert.equal(f('Enter', true, 'control'), null);
  assert.equal(f('1', true), null);
  for (const key of ['1', 'a', 'Enter']) for (const answered of [false, true]) assert.equal(f(key, answered, 'field'), null, key);
});
