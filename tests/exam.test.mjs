// Unit tests for the full-test (exam) logic and data. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TESTS, TOTAL, answeredCount, examKey, filledText, gradeTest, mmss, orderedSentences, questionsOf, scaled, testByNo, toggleLetter, usedWords } from '../src/exam.js';

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
