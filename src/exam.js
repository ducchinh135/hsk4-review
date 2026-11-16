// Full-test practice (the reading section of the 10 mock HSK 4 tests of 汉语水平考试模拟试题集), with
// no React so Node tests can use it. One test = the reading section, Q46-85, answered on one paper
// and graded at once.
import T01 from './data/exams/hsk4-01.json' with { type: 'json' };
import T02 from './data/exams/hsk4-02.json' with { type: 'json' };
import T03 from './data/exams/hsk4-03.json' with { type: 'json' };
import T04 from './data/exams/hsk4-04.json' with { type: 'json' };
import T05 from './data/exams/hsk4-05.json' with { type: 'json' };
import T06 from './data/exams/hsk4-06.json' with { type: 'json' };
import T07 from './data/exams/hsk4-07.json' with { type: 'json' };
import T08 from './data/exams/hsk4-08.json' with { type: 'json' };
import T09 from './data/exams/hsk4-09.json' with { type: 'json' };
import T10 from './data/exams/hsk4-10.json' with { type: 'json' };

export const TESTS = [T01, T02, T03, T04, T05, T06, T07, T08, T09, T10];
export const testByNo = (n) => TESTS.find((t) => t.test === Number(n));

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
// The real exam gives 40 minutes for the 40 reading questions.
export const EXAM_MINUTES = 40;

// Mark key of question `no` of test `t` (marks are shared with the rest of the app).
export const examKey = (t, no) => `x:${t}:${no}`;

// Every question of the reading section, in order, as { no, part, key, kind, ... }: the part-1 blanks
// (kind "blank", with the set), the part-2 orders (kind "order") and the part-3 questions (kind
// "choice", with their passage). `answer` is a 0-based index, or the order string for "order".
export function questionsOf(test) {
  const r = test.reading;
  const out = [];
  for (const set of r.part1.sets) for (const item of set.items) out.push({ ...item, part: 1, kind: 'blank', set });
  for (const q of r.part2.questions) out.push({ ...q, part: 2, kind: 'order' });
  for (const p of r.part3.passages) for (const q of p.questions) out.push({ ...q, part: 3, kind: 'choice', passage: p });
  return out;
}

export const TOTAL = 40;

// answers: { [no]: index | order string } -> { score, total, byNo: { [no]: boolean } }. A question left
// unanswered, or an order with fewer than three sentences, is wrong.
export function gradeTest(test, answers) {
  const byNo = {};
  let score = 0;
  for (const q of questionsOf(test)) {
    const given = answers[q.no];
    const ok = given !== undefined && given === q.answer;
    byNo[q.no] = ok;
    if (ok) score += 1;
  }
  return { score, total: TOTAL, byNo };
}

// The three sentences of a part-2 question in the order given ("BCA" = B first, then C, then A).
export const orderedSentences = (q, order = q.answer) => [...order].map((l) => q.sentences['ABC'.indexOf(l)]);

// Add letter `k` (0-2) to the order typed so far, or take it out when it is already in; never more
// than three letters.
export function toggleLetter(order = '', k) {
  const l = 'ABC'[k];
  if (order.includes(l)) return order.replace(l, '');
  return order.length < 3 ? order + l : order;
}

// How many of the 40 questions have an answer (an order counts once its three letters are in).
export function answeredCount(test, answers) {
  return questionsOf(test).filter((q) => (q.kind === 'order' ? (answers[q.no] || '').length === 3 : answers[q.no] !== undefined)).length;
}

// Part-1 words already placed in the blanks of `set`, plus the example's word.
export function usedWords(set, answers) {
  const used = new Set([set.example.answer]);
  for (const it of set.items) if (answers[it.no] !== undefined) used.add(answers[it.no]);
  return used;
}

// Part-1 text with its blank replaced.
export const filledText = (text, word) => text.replace('___', word);

// Results are kept per test in localStorage: { [test]: { best, last, at } }.
const RESULTS_KEY = 'hsk4_exam_results_v1';
export function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
export function saveResult(test, score) {
  const all = loadResults();
  const prev = all[test];
  all[test] = { best: Math.max(score, prev ? prev.best : 0), last: score, at: Date.now() };
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the score is just not remembered */
  }
  return all[test];
}

// 0-100 reading score the way HSK reports it (100 points for 40 questions).
export const scaled = (score) => Math.round((score / TOTAL) * 100);

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
