// Unit tests for quiz question building and pinyin checking. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_COUNT, QUIZ_TYPES, applicableTypes, buildQuiz, checkPinyin, countApplicable, makeQuestion, pinyinKey } from '../src/quiz.js';

const W = (h, p, m, zh) => [h, p, m, zh, ''];
const LESSON = [
  W('法律', 'fǎlǜ', 'luật pháp (dt)', '他在大学学习法律。'),
  W('俩', 'liǎ', 'hai người (sl)', '他们俩是好朋友。'),
  W('深', 'shēn', 'sâu (tt)', '这条河很深。'),
  W('印象', 'yìnxiàng', 'ấn tượng (dt)', '他给我的印象很好。'),
  W('熟悉', 'shúxi', 'quen thuộc (đgt)', '我对这里很熟悉。'),
];
const OTHER = [W('爱情', 'àiqíng', 'tình yêu (dt)', '爱情很重要。'), W('浪漫', 'làngmàn', 'lãng mạn (tt)', '他很浪漫。')];
const ALL = [...LESSON, ...OTHER];
function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

test('pinyinKey() splits letters and the tone sequence', () => {
  assert.deepEqual(pinyinKey('fǎlǜ'), { letters: 'falü', tones: '34' });
  assert.deepEqual(pinyinKey('fa3lv4'), { letters: 'falü', tones: '34' });
  assert.deepEqual(pinyinKey(' Fa3 Lu:4 '), { letters: 'falü', tones: '34' });
  assert.deepEqual(pinyinKey('shúxi'), { letters: 'shuxi', tones: '2' });
  assert.deepEqual(pinyinKey('shu2xi5'), { letters: 'shuxi', tones: '2' });
  assert.deepEqual(pinyinKey("xī'ān"), { letters: 'xian', tones: '11' });
});

test('checkPinyin() accepts tone marks, tone numbers and decomposed Unicode', () => {
  assert.equal(checkPinyin('fǎlǜ', 'fǎlǜ'), 'ok');
  assert.equal(checkPinyin('fa3lv4', 'fǎlǜ'), 'ok');
  assert.equal(checkPinyin('fa3 lu:4', 'fǎlǜ'), 'ok');
  assert.equal(checkPinyin('fa\u030Clu\u0308\u0300', 'fǎlǜ'), 'ok', 'NFD input from macOS/iOS keyboards');
  assert.equal(checkPinyin('shu2xi', 'shúxi'), 'ok');
  assert.equal(checkPinyin('shu2xi5', 'shúxi'), 'ok');
});

test('checkPinyin() reports wrong tones separately, and can ignore tones', () => {
  assert.equal(checkPinyin('fa1lv4', 'fǎlǜ'), 'tone');
  assert.equal(checkPinyin('falv', 'fǎlǜ'), 'tone');
  assert.equal(checkPinyin('fa1lv4', 'fǎlǜ', { tones: false }), 'ok');
  assert.equal(checkPinyin('falv', 'fǎlǜ', { tones: false }), 'ok');
  assert.equal(checkPinyin('fala', 'fǎlǜ'), 'wrong');
  assert.equal(checkPinyin('fala', 'fǎlǜ', { tones: false }), 'wrong');
});

test('checkPinyin() treats empty or blank input as wrong', () => {
  assert.equal(checkPinyin('', 'fǎlǜ'), 'wrong');
  assert.equal(checkPinyin('   ', 'fǎlǜ', { tones: false }), 'wrong');
});

test('makeQuestion(): 4 distinct options that include the answer, for every choice type', () => {
  for (const type of ['meaning', 'hanzi', 'listen', 'fill']) {
    for (let s = 1; s <= 40; s++) {
      const q = makeQuestion(LESSON[s % 5], type, LESSON, ALL, seeded(s));
      assert.equal(q.options.length, 4, type);
      assert.equal(new Set(q.options).size, 4, type);
      assert.ok(q.options.includes(q.answer), type);
      assert.equal(q.answer, type === 'meaning' ? q.word[2] : q.word[0]);
    }
  }
});

test('makeQuestion(): borrows distractors from other lessons when the lesson is small', () => {
  const small = LESSON.slice(0, 2);
  const q = makeQuestion(small[0], 'hanzi', small, ALL, seeded(3));
  assert.equal(new Set(q.options).size, 4);
  assert.ok(q.options.includes('法律'));
});

test('makeQuestion(): never shows two options with the same text', () => {
  const lesson = [...LESSON, W('深刻', 'shēnkè', 'sâu (tt)', '印象很深刻。')];
  for (let s = 1; s <= 40; s++) {
    const q = makeQuestion(lesson[2], 'meaning', lesson, [...lesson, ...OTHER], seeded(s));
    assert.equal(q.options.filter((o) => o === 'sâu (tt)').length, 1);
    assert.equal(new Set(q.options).size, 4);
  }
});

test('makeQuestion(): pinyin question has no options', () => {
  const q = makeQuestion(LESSON[0], 'pinyin', LESSON, ALL);
  assert.equal(q.answer, 'fǎlǜ');
  assert.equal(q.options, undefined);
});

test('applicableTypes() drops fill when the word is not in its sentence, and listen without speech', () => {
  const all = QUIZ_TYPES.map(([t]) => t);
  const odd = W('法律', 'fǎlǜ', 'luật pháp', '这句话里没有那个词。');
  assert.deepEqual(applicableTypes(odd, all, { canSpeak: true }), ['meaning', 'hanzi', 'listen', 'pinyin']);
  assert.deepEqual(applicableTypes(LESSON[0], all, { canSpeak: false }), ['meaning', 'hanzi', 'pinyin', 'fill']);
});

test('buildQuiz(): count, distinct words, and only the chosen types', () => {
  const three = buildQuiz(LESSON, { types: ['hanzi', 'pinyin'], count: 3 }, LESSON, ALL, { rng: seeded(5) });
  assert.equal(three.length, 3);
  assert.equal(new Set(three.map((q) => q.word[0])).size, 3);
  assert.ok(three.every((q) => q.type === 'hanzi' || q.type === 'pinyin'));
  assert.equal(buildQuiz(LESSON, { types: ['meaning'], count: 'all' }, LESSON, ALL).length, 5);
  assert.equal(buildQuiz(LESSON, { types: ['meaning'], count: 20 }, LESSON, ALL).length, 5);
});

test('buildQuiz(): listen-only quiz without speech support is empty instead of crashing', () => {
  assert.deepEqual(buildQuiz(LESSON, { types: ['listen'], count: 10 }, LESSON, ALL, { canSpeak: false }), []);
});

test('countApplicable() counts the words one exercise type can use', () => {
  const noSentence = W('学', 'xué', 'học (đgt)', '我喜欢读书。'); // sentence lacks the word itself
  const words = [...LESSON, noSentence];
  assert.equal(countApplicable(words, 'meaning', { canSpeak: true }), 6);
  assert.equal(countApplicable(words, 'fill', { canSpeak: true }), 5);
  assert.equal(countApplicable(words, 'listen', { canSpeak: true }), 6);
  assert.equal(countApplicable(words, 'listen', { canSpeak: false }), 0);
  assert.equal(countApplicable([], 'pinyin', { canSpeak: true }), 0);
});

test('buildQuiz() with one type caps at PRACTICE_COUNT, one question per word', () => {
  const many = Array.from({ length: 30 }, (_, i) => W('字' + i, 'zi' + i, 'nghĩa ' + i, '句子字' + i + '。'));
  const qs = buildQuiz(many, { types: ['hanzi'], count: PRACTICE_COUNT }, many, many, { canSpeak: true, rng: seeded(7) });
  assert.equal(PRACTICE_COUNT, 20);
  assert.equal(qs.length, PRACTICE_COUNT);
  assert.ok(qs.every((q) => q.type === 'hanzi'));
  assert.equal(new Set(qs.map((q) => q.word[0])).size, PRACTICE_COUNT);
});

test('buildQuiz() returns no questions when the type fits none of the words', () => {
  const none = [W('学', 'xué', 'học', '我喜欢读书。')];
  assert.deepEqual(buildQuiz(none, { types: ['fill'], count: PRACTICE_COUNT }, none, none, { canSpeak: true }), []);
  assert.deepEqual(buildQuiz(LESSON, { types: ['listen'], count: PRACTICE_COUNT }, LESSON, ALL, { canSpeak: false }), []);
});
