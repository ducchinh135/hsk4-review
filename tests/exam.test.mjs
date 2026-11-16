// Unit tests for the full-test (exam) logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TESTS, TOTAL, TOTALS, hanCount, isRight, normalizeSentence, writingOf, answeredCount, audioUrl, clipsOf, gapOf, isAnswered, listeningOf, sectionQuestions, examKey, filledText, gradeTest, mmss, orderedSentences, questionsOf, scaled, testByNo, toggleLetter, usedWords } from '../src/exam.js';

test('there are ten tests, numbered 1-10', () => {
  assert.deepEqual(TESTS.map((t) => t.test), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(testByNo('3').test, 3);
  assert.equal(testByNo(11), undefined);
});

test('every test has the 40 reading questions 46-85, once each, in order', () => {
  for (const t of TESTS) {
    const nos = questionsOf(t).map((q) => q.no);
    assert.deepEqual(nos, Array.from({ length: TOTAL }, (_, i) => 46 + i), `test ${t.test}`);
  }
});

test('every question is well formed', () => {
  for (const t of TESTS) {
    for (const q of questionsOf(t)) {
      const at = `test ${t.test} Q${q.no}`;
      assert.ok(q.explain, at + ' explain');
      if (q.kind === 'blank') {
        assert.equal(q.set.words.length, 6, at);
        assert.ok(q.answer >= 0 && q.answer < 6 && q.answer !== q.set.example.answer, at);
        assert.ok(q.text.includes('___'), at + ' blank');
      } else if (q.kind === 'order') {
        assert.equal(q.sentences.length, 3, at);
        assert.deepEqual([...q.answer].sort(), ['A', 'B', 'C'], at);
      } else {
        assert.equal(q.options.length, 4, at);
        assert.ok(q.answer >= 0 && q.answer < 4, at);
        assert.ok(q.passage.text, at + ' passage');
      }
    }
  }
});

test('a part-1 set uses all six words exactly once, the example included', () => {
  for (const t of TESTS) {
    for (const set of t.reading.part1.sets) {
      const used = [set.example.answer, ...set.items.map((i) => i.answer)];
      assert.equal(new Set(used).size, 6, `test ${t.test} ${set.range}`);
    }
  }
});

test('gradeTest() counts the right answers; blanks and short orders are wrong', () => {
  const t = TESTS[0];
  const all = Object.fromEntries(questionsOf(t).map((q) => [q.no, q.answer]));
  assert.deepEqual(gradeTest(t, all).score, 40);
  assert.equal(gradeTest(t, {}).score, 0);
  const some = { ...all, 46: (all[46] + 1) % 6, 56: all[56].slice(0, 2) };
  const g = gradeTest(t, some);
  assert.equal(g.score, 38);
  assert.equal(g.byNo[46], false);
  assert.equal(g.byNo[56], false);
  assert.equal(g.byNo[47], true);
});

test('toggleLetter() builds an order, removes a letter that is already in, and stops at three', () => {
  assert.equal(toggleLetter('', 1), 'B');
  assert.equal(toggleLetter('B', 2), 'BC');
  assert.equal(toggleLetter('BC', 0), 'BCA');
  assert.equal(toggleLetter('BCA', 1), 'CA');
  assert.equal(toggleLetter('BC', 2), 'B');
  assert.equal(toggleLetter(undefined, 0), 'A');
});

test('answeredCount() counts an order only once it has three letters', () => {
  const t = TESTS[0];
  assert.equal(answeredCount(t, {}), 0);
  assert.equal(answeredCount(t, { 46: 0, 56: 'BC' }), 1);
  assert.equal(answeredCount(t, { 46: 0, 56: 'BCA', 66: 0 }), 3);
});

test('usedWords() always includes the example word', () => {
  const set = TESTS[0].reading.part1.sets[0];
  assert.deepEqual([...usedWords(set, {})], [set.example.answer]);
  assert.ok(usedWords(set, { 46: 2 }).has(2));
});

test('orderedSentences(), filledText(), examKey(), scaled() and mmss()', () => {
  const q = { sentences: ['a', 'b', 'c'], answer: 'BCA' };
  assert.deepEqual(orderedSentences(q), ['b', 'c', 'a']);
  assert.deepEqual(orderedSentences(q, 'ABC'), ['a', 'b', 'c']);
  assert.equal(filledText('我___你', '爱'), '我爱你');
  assert.equal(examKey(3, 56), 'x:3:56');
  assert.equal(scaled(40), 100);
  assert.equal(scaled(30), 75);
  assert.equal(mmss(2400), '40:00');
  assert.equal(mmss(65), '01:05');
  assert.equal(mmss(-3), '00:00');
});

const publicPath = (url) => fileURLToPath(new URL('../public' + url, import.meta.url));

test('every test has the 45 listening questions 1-45, once each, in order', () => {
  for (const t of TESTS) {
    assert.deepEqual(listeningOf(t).map((q) => q.no), Array.from({ length: 45 }, (_, i) => i + 1), `test ${t.test}`);
    assert.equal(sectionQuestions(t, 'listening').length, TOTALS.listening);
    assert.equal(sectionQuestions(t, 'reading').length, TOTALS.reading);
  }
});

test('every listening question is well formed and has its audio clip', () => {
  for (const t of TESTS) {
    for (const q of listeningOf(t)) {
      const at = `test ${t.test} Q${q.no}`;
      assert.ok(q.explain && q.vi && q.script.length, at);
      if (q.kind === 'tf') assert.equal(typeof q.answer, 'boolean', at);
      else {
        assert.equal(q.options.length, 4, at);
        assert.ok(q.answer >= 0 && q.answer < 4, at);
      }
      if (q.part === 3) assert.ok(q.group.includes(q.no) && q.question, at);
      for (const c of clipsOf(t, q)) assert.ok(existsSync(publicPath(audioUrl(c.file))), at + ' ' + c.file);
      assert.ok(gapOf(t, q.no) >= 10 && gapOf(t, q.no) <= 21, at + ' gap');
    }
  }
});

test('part 1 listening has 10 questions and the exam gives 10 s then 17 s to answer', () => {
  const t = TESTS[0];
  assert.equal(listeningOf(t).filter((q) => q.part === 1).length, 10);
  assert.ok(Math.abs(gapOf(t, 1) - 10) <= 1.5);
  assert.ok(Math.abs(gapOf(t, 20) - 17) <= 1.5);
});

test('the second question of a shared passage plays the passage clip first', () => {
  const t = TESTS[0];
  const q36 = listeningOf(t).find((q) => q.no === 36);
  const q37 = listeningOf(t).find((q) => q.no === 37);
  assert.deepEqual(q36.group, [36, 37]);
  assert.equal(clipsOf(t, q36).length, 1);
  assert.deepEqual(clipsOf(t, q37).map((c) => c.file), ['t01/q36.mp3', 't01/q37.mp3']);
});

test('gradeTest() grades a listening section; true/false answers compare strictly', () => {
  const t = TESTS[0];
  const all = Object.fromEntries(listeningOf(t).map((q) => [q.no, q.answer]));
  assert.equal(gradeTest(t, all, 'listening').score, 45);
  assert.equal(gradeTest(t, {}, 'listening').total, 45);
  const q1 = listeningOf(t)[0];
  assert.equal(gradeTest(t, { ...all, 1: !q1.answer }, 'listening').score, 44);
  assert.equal(answeredCount(t, { 1: false, 11: 0 }, 'listening'), 2);
  assert.equal(isAnswered(q1, false), true);
  assert.equal(isAnswered(q1, undefined), false);
});

test('every test has the 15 writing questions 86-100, once each, in order', () => {
  for (const t of TESTS) {
    assert.deepEqual(writingOf(t).map((q) => q.no), Array.from({ length: 15 }, (_, i) => 86 + i), `test ${t.test}`);
    assert.equal(sectionQuestions(t, 'writing').length, 15);
  }
});

test('every writing question is well formed, and its part-1 answers use exactly the given words', () => {
  const strip = (s) => [...normalizeSentence(s)].sort().join('');
  for (const t of TESTS) {
    for (const q of writingOf(t)) {
      const at = `test ${t.test} Q${q.no}`;
      assert.ok(q.vi && q.explain, at);
      if (q.kind === 'sentence') {
        assert.ok(q.words.length >= 3 && q.words.length <= 6, at);
        assert.ok(q.answers.length >= 1, at);
        for (const a of q.answers) assert.equal(strip(a), strip(q.words.join('')), at + ' ' + a);
      } else {
        assert.ok(q.word && q.answer, at);
        assert.ok(existsSync(publicPath(q.image)), at + ' image ' + q.image);
      }
    }
  }
});

test('normalizeSentence() ignores spaces and punctuation; hanCount() counts characters', () => {
  assert.equal(normalizeSentence(' 你最好 重新换一个密码。'), '你最好重新换一个密码');
  assert.equal(normalizeSentence('他在看书，对吗？'), '他在看书对吗');
  assert.equal(normalizeSentence(undefined), '');
  assert.equal(hanCount('我 love 你！'), 2);
});

test('writing part 1 is graded against every sentence the book lists; part 2 is never graded', () => {
  const q = { kind: 'sentence', answers: ['你最好重新换一个密码。', '你最好换一个密码。'] };
  assert.equal(isRight(q, '你最好 换一个密码'), true);
  assert.equal(isRight(q, '你最好重新换一个密码！'), true);
  assert.equal(isRight(q, '换一个密码你最好'), false);
  assert.equal(isRight(q, ''), false);
  assert.equal(isRight({ kind: 'free', answer: 'x' }, 'x'), false);
  const t = TESTS[0];
  const all = Object.fromEntries(writingOf(t).filter((w) => w.kind === 'sentence').map((w) => [w.no, w.answers[0]]));
  const g = gradeTest(t, all, 'writing');
  assert.equal(g.score, 10);
  assert.equal(g.total, TOTALS.writing);
  assert.equal(gradeTest(t, { ...all, 86: '' }, 'writing').score, 9);
  assert.equal(answeredCount(t, { 86: '你', 96: ' ' }, 'writing'), 1);
});
