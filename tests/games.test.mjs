// Unit tests for the reflex games' pure logic. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_WORDS, LESSON_ORDER, VOCAB, WORD_BY_HANZI } from '../src/lessons.js';
import {
  DEFAULT_SETTINGS,
  checkTyped,
  fallMs,
  finishItem,
  hintMask,
  initialShown,
  keyMatchesTile,
  newRound,
  normalizeSettings,
  pickWords,
  poolFor,
  spawnX,
  tileLetters,
} from '../src/games.js';

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

test('normalizeSettings() keeps valid fields and resets bad ones', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings('xx'), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ lesson: 'L99', filter: 'r', order: 'x', count: 7 }), { ...DEFAULT_SETTINGS, filter: 'r' });
  assert.deepEqual(
    normalizeSettings({ lesson: LESSON_ORDER[2], filter: 'k', order: 'lesson', count: 'all' }),
    { lesson: LESSON_ORDER[2], filter: 'k', order: 'lesson', count: 'all' }
  );
});

test('poolFor() filters by lesson and mark; all lessons means ALL_WORDS', () => {
  const none = () => '';
  assert.equal(poolFor({ ...DEFAULT_SETTINGS }, none).length, ALL_WORDS.length);
  assert.deepEqual(poolFor({ ...DEFAULT_SETTINGS, lesson: LESSON_ORDER[0] }, none), VOCAB[LESSON_ORDER[0]].words);
  const mark = (h) => (h === '法律' ? 'r' : h === '深' ? 'k' : '');
  assert.deepEqual(poolFor({ ...DEFAULT_SETTINGS, filter: 'r' }, mark).map((w) => w[0]), ['法律']);
  assert.ok(!poolFor({ ...DEFAULT_SETTINGS, filter: 'new' }, mark).some((w) => ['法律', '深'].includes(w[0])));
  assert.deepEqual(poolFor({ ...DEFAULT_SETTINGS, filter: 'k' }, none), []);
});

test('pickWords() orders, shuffles and caps', () => {
  const none = () => '';
  const ordered = pickWords({ ...DEFAULT_SETTINGS, order: 'lesson', count: 10 }, none);
  assert.deepEqual(ordered, ALL_WORDS.slice(0, 10));
  const random = pickWords({ ...DEFAULT_SETTINGS, count: 20 }, none, seeded(7));
  assert.equal(random.length, 20);
  assert.equal(new Set(random.map((w) => w[0])).size, 20);
  assert.notDeepEqual(random, ALL_WORDS.slice(0, 20));
  const small = VOCAB[LESSON_ORDER[0]].words.length;
  assert.equal(pickWords({ ...DEFAULT_SETTINGS, lesson: LESSON_ORDER[0], count: 100 }, none).length, small);
  assert.equal(pickWords({ ...DEFAULT_SETTINGS, count: 'all' }, none).length, ALL_WORDS.length);
});

test('checkTyped() in meaning mode ignores tones, accepts hanzi and exact-meaning synonyms', () => {
  const w = WORD_BY_HANZI['法律'];
  for (const s of ['falü', 'falv', 'fa3lv4', 'fǎlǜ', ' Fa Lv ', '法律', 'fa1lv1']) assert.equal(checkTyped(s, w, 'meaning'), 'ok', s);
  for (const s of ['', 'fal', 'falu', '法']) assert.equal(checkTyped(s, w, 'meaning'), 'wrong', s);
  assert.equal(checkTyped("da'an", WORD_BY_HANZI['答案'], 'meaning'), 'ok');
  assert.equal(checkTyped('究竟', WORD_BY_HANZI['到底'], 'meaning'), 'synonym');
  assert.equal(checkTyped('jiujing', WORD_BY_HANZI['到底'], 'meaning'), 'synonym');
  assert.equal(checkTyped('厕所', WORD_BY_HANZI['卫生间'], 'meaning'), 'synonym');
});

test('checkTyped() in pinyin mode needs the tones and rejects hanzi', () => {
  const w = WORD_BY_HANZI['法律'];
  assert.equal(checkTyped('fa3lv4', w, 'pinyin'), 'ok');
  assert.equal(checkTyped('fǎlǜ', w, 'pinyin'), 'ok');
  assert.equal(checkTyped('fa1lv4', w, 'pinyin'), 'tone');
  assert.equal(checkTyped('falv', w, 'pinyin'), 'tone');
  assert.equal(checkTyped('法律', w, 'pinyin'), 'wrong');
});

test('hintMask() reveals letters from the start', () => {
  assert.deepEqual(hintMask('fǎlǜ', 1), ['f', '_', '_', '_']);
  assert.deepEqual(hintMask('fǎlǜ', 2), ['f', 'a', '_', '_']);
  assert.deepEqual(hintMask("dá'àn", 9), ['d', 'a', 'a', 'n']);
});

test('finishItem() requeues a miss 3 places later, at most 3 attempts', () => {
  const ws = ALL_WORDS.slice(0, 5);
  let r = newRound(ws);
  assert.deepEqual([r.total, r.done, r.firstTry, r.missed], [5, 0, 0, []]);
  r = finishItem(r, true);
  assert.deepEqual(r.queue.map((i) => i.word[0]), [ws[1], ws[2], ws[3], ws[0], ws[4]].map((w) => w[0]));
  assert.equal(r.queue[3].attempt, 2);
  assert.deepEqual(r.missed, [ws[0]]);
  r = finishItem(r, false);
  assert.deepEqual([r.done, r.firstTry], [1, 1]);
  let s = newRound([ws[0]]);
  s = finishItem(s, true);
  s = finishItem(s, true);
  assert.equal(s.queue.length, 1);
  s = finishItem(s, true);
  assert.deepEqual([s.queue.length, s.done, s.missed.length], [0, 1, 1]);
  let t = finishItem(newRound([ws[0]]), true);
  t = finishItem(t, false);
  assert.deepEqual([t.done, t.firstTry], [1, 0]);
});

test('fallMs() speeds up 2% per meteor down to 10 s', () => {
  assert.equal(fallMs(0), 20000);
  assert.equal(Math.round(fallMs(1)), 19600);
  assert.equal(fallMs(100), 10000);
});

test('tileLetters() gives one tile per pinyin letter, without tones', () => {
  assert.deepEqual(tileLetters('fǎlǜ'), ['f', 'a', 'l', 'ü']);
  assert.deepEqual(tileLetters("dá'àn"), ['d', 'a', 'a', 'n']);
  assert.deepEqual(tileLetters('Yìnxiàng'), ['y', 'i', 'n', 'x', 'i', 'a', 'n', 'g']);
});

test('keyMatchesTile() takes the letter itself, and v or u for ü', () => {
  assert.ok(keyMatchesTile('f', 'f'));
  assert.ok(!keyMatchesTile('g', 'f'));
  assert.ok(keyMatchesTile('v', 'ü'));
  assert.ok(keyMatchesTile('u', 'ü'));
  assert.ok(!keyMatchesTile('v', 'u'));
});

test('initialShown() gives the first letter and always leaves a tile to type', () => {
  assert.equal(initialShown('fǎlǜ'), 1);
  assert.equal(initialShown('ér'), 1);
  assert.equal(initialShown('a'), 0);
});

test('spawnX() stays inside 0.1..0.9 and away from meteors near the top', () => {
  const rng = seeded(3);
  for (let i = 0; i < 50; i++) {
    const x = spawnX([{ x: 0.5, y: 0.1, state: 'fall' }], rng);
    assert.ok(x >= 0.1 && x <= 0.9);
    assert.ok(Math.abs(x - 0.5) >= 0.22, String(x));
  }
});
