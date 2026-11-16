// Full-test practice (the listening and reading sections of the 10 mock HSK 4 tests of
// 汉语水平考试模拟试题集), with no React so Node tests can use it. Questions 1-45 are the listening
// section, 46-85 the reading section (writing is not included).
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

import L01 from './data/exams/hsk4-listening-01.json' with { type: 'json' };
import L02 from './data/exams/hsk4-listening-02.json' with { type: 'json' };
import L03 from './data/exams/hsk4-listening-03.json' with { type: 'json' };
import L04 from './data/exams/hsk4-listening-04.json' with { type: 'json' };
import L05 from './data/exams/hsk4-listening-05.json' with { type: 'json' };
import L06 from './data/exams/hsk4-listening-06.json' with { type: 'json' };
import L07 from './data/exams/hsk4-listening-07.json' with { type: 'json' };
import L08 from './data/exams/hsk4-listening-08.json' with { type: 'json' };
import L09 from './data/exams/hsk4-listening-09.json' with { type: 'json' };
import L10 from './data/exams/hsk4-listening-10.json' with { type: 'json' };
import AUDIO from './data/exams/audio-manifest.json' with { type: 'json' };

const LISTENING = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10];
// Each test: its reading section (hsk4-NN.json) and its listening section (hsk4-listening-NN.json).
const READING = [T01, T02, T03, T04, T05, T06, T07, T08, T09, T10];
export const TESTS = READING.map((t, i) => ({ ...t, listening: LISTENING[i].listening }));
export const testByNo = (n) => TESTS.find((t) => t.test === Number(n));

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
// The real exam: 45 listening questions (about 30 minutes, the audio sets the pace) and 40 reading
// questions in 40 minutes.
export const SECTIONS = ['listening', 'reading'];
export const TOTALS = { listening: 45, reading: 40 };
export const EXAM_MINUTES = 40;
export const SECTION_NAME = { listening: 'Nghe', reading: 'Đọc' };

// Mark key of question `no` of test `t` (marks are shared with the rest of the app).
export const examKey = (t, no) => `x:${t}:${no}`;

// Every question of the reading section, in order, as { no, part, key, kind, ... }: the part-1 blanks
// (kind "blank", with the set), the part-2 orders (kind "order") and the part-3 questions (kind
// "choice", with their passage). `answer` is a 0-based index, or the order string for "order".
export function questionsOf(test) {
  const r = test.reading;
  const out = [];
  for (const set of r.part1.sets) for (const item of set.items) out.push({ ...item, part: 1, kind: 'blank', set, section: 'reading' });
  for (const q of r.part2.questions) out.push({ ...q, part: 2, kind: 'order', section: 'reading' });
  for (const p of r.part3.passages) for (const q of p.questions) out.push({ ...q, part: 3, kind: 'choice', passage: p, section: 'reading' });
  return out;
}

// Every question of the listening section, in order: part 1 true/false (kind "tf", answer true or
// false) and parts 2-3 with four options (kind "choice", 0-based answer).
export function listeningOf(test) {
  const l = test.listening;
  const out = [];
  for (const q of l.part1.questions) out.push({ ...q, part: 1, kind: 'tf', section: 'listening' });
  for (const q of l.part2.questions) out.push({ ...q, part: 2, kind: 'choice', section: 'listening' });
  for (const q of l.part3.questions) out.push({ ...q, part: 3, kind: 'choice', section: 'listening' });
  return out;
}

export const sectionQuestions = (test, section) => (section === 'listening' ? listeningOf(test) : questionsOf(test));

// Has the question an answer (an order counts once its three letters are in)?
export const isAnswered = (q, a) => (q.kind === 'order' ? (a || '').length === 3 : a !== undefined);

// The audio clips that play for question `no` of `test`: its own, and for the second question of a
// shared passage (Q37, 39, ...) the first question's clip (the passage) before it.
export const audioUrl = (file) => '/audio/exam/' + file;
export function clipsOf(test, q) {
  const own = AUDIO[test.test][q.no];
  const first = q.group && q.group[0] !== q.no ? AUDIO[test.test][q.group[0]] : null;
  return first ? [{ file: first.file, label: 'Đoạn nghe' }, { file: own.file, label: 'Câu hỏi' }] : [{ file: own.file, label: 'Nghe' }];
}
// Seconds of answering time that follow question `no` in the real exam (10 in part 1, 17 after).
export const gapOf = (test, no) => AUDIO[test.test][no].gap;

export const TOTAL = 40;

// answers: { [no]: index | order string | boolean } -> { score, total, byNo: { [no]: boolean } } for one
// section (reading unless told otherwise). A question left unanswered, or an order with fewer than three
// sentences, is wrong.
export function gradeTest(test, answers, section = 'reading') {
  const byNo = {};
  let score = 0;
  const qs = sectionQuestions(test, section);
  for (const q of qs) {
    const given = answers[q.no];
    const ok = given !== undefined && given === q.answer;
    byNo[q.no] = ok;
    if (ok) score += 1;
  }
  return { score, total: qs.length, byNo };
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

// How many questions of a section have an answer.
export function answeredCount(test, answers, section = 'reading') {
  return sectionQuestions(test, section).filter((q) => isAnswered(q, answers[q.no])).length;
}

// Part-1 words already placed in the blanks of `set`, plus the example's word.
export function usedWords(set, answers) {
  const used = new Set([set.example.answer]);
  for (const it of set.items) if (answers[it.no] !== undefined) used.add(answers[it.no]);
  return used;
}

// Part-1 text with its blank replaced.
export const filledText = (text, word) => text.replace('___', word);

// Real-exam results are kept per test in localStorage: { [test]: { last: { listening, reading, at },
// best } } where best is the best listening + reading total (out of 85).
const RESULTS_KEY = 'hsk4_exam_results_v2';
export function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
export function saveResult(test, scores) {
  const all = loadResults();
  const prev = all[test];
  const total = (scores.listening || 0) + (scores.reading || 0);
  all[test] = { last: { ...scores, at: Date.now() }, best: Math.max(total, prev ? prev.best : 0) };
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the score is just not remembered */
  }
  return all[test];
}

// 0-100 section score the way HSK reports it (100 points per section).
export const scaled = (score, total = TOTAL) => Math.round((score / total) * 100);

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
