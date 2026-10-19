// Unit tests for the listening logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import RAW from '../src/data/listening.json' with { type: 'json' };
import { buildMix, buildRun, keyAction, listenKey, reviewQuestions, validateListening } from '../src/listening.js';

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
