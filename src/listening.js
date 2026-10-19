// Listening practice (HSK4 exam part I and, later, II and III): questions, runs and validation, with
// no React so Node tests can use them.
import RAW from './data/listening.json' with { type: 'json' };
import { shuffle } from './random.js';

// The three parts of the exam's listening section; only those in listening.json have content.
export const PART_TABS = [
  { id: 'p1', label: '① 判断对错' },
  { id: 'p2', label: '② 选择正确答案' },
  { id: 'p3', label: '③ 对话 · 短文' },
];

export const PARTS = RAW.parts;
export const partById = (id) => PARTS.find((p) => p.id === id);
export const QUESTION_BY_ID = Object.fromEntries(PARTS.flatMap((p) => p.questions.map((q) => [q.id, { ...q, partId: p.id }])));

export const listenKey = (id) => 'l:' + id;
export const audioUrl = (id) => '/audio/listening/' + id + '.mp3';

export const questionsOf = (part, typeId) => (typeId ? part.questions.filter((q) => q.type === typeId) : part.questions);

export function typeCount(part) {
  const n = Object.fromEntries(part.types.map((t) => [t.id, 0]));
  for (const q of part.questions) n[q.type] = (n[q.type] || 0) + 1;
  return n;
}

// The questions in random order, at most `max` of them.
export const buildRun = (questions, { max = Infinity, rng = Math.random } = {}) => shuffle(questions, rng).slice(0, max);

// `n` questions taken in turn from each type that has questions (types and questions shuffled).
export function buildMix(part, n = 10, rng = Math.random) {
  const queues = shuffle(
    part.types.map((t) => shuffle(questionsOf(part, t.id), rng)).filter((qs) => qs.length),
    rng
  );
  const out = [];
  for (let i = 0; out.length < n && queues.some((qs) => i < qs.length); i++) {
    for (const qs of queues) if (i < qs.length && out.length < n) out.push(qs[i]);
  }
  return out;
}

export const reviewQuestions = (getMark, part) =>
  part.questions.filter((q) => getMark(listenKey(q.id)) === 'r').sort((a, b) => (a.id < b.id ? -1 : 1));

// What a key press does in a run: 'true' / 'false' answers (1 or ← = 对, 2 or → = 错), 'next' moves on
// once answered, null = ignore. `target` is where focus is: 'field' (typing), 'answer' (an answer
// button, which keeps focus after a click), 'control' (another button or link, which handles Enter
// itself) or 'other'.
export function keyAction({ key, answered, target }) {
  if (target === 'field') return null;
  if (!answered) return key === '1' || key === 'ArrowLeft' ? 'true' : key === '2' || key === 'ArrowRight' ? 'false' : null;
  return key === 'Enter' && target !== 'control' ? 'next' : null;
}

export const RATES = [0.8, 1, 1.25];
const RATE_KEY = 'hsk4_listen_rate';
const PINYIN_KEY = 'hsk4_listen_pinyin';

export function loadRate() {
  try {
    const r = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(r) ? r : 1;
  } catch {
    return 1;
  }
}
export function saveRate(r) {
  try {
    localStorage.setItem(RATE_KEY, String(r));
  } catch {
    /* storage unavailable */
  }
}
export function loadShowPinyin() {
  try {
    return localStorage.getItem(PINYIN_KEY) !== '0';
  } catch {
    return true;
  }
}
export function saveShowPinyin(b) {
  try {
    localStorage.setItem(PINYIN_KEY, b ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

const TEXT_FIELDS = ['text', 'pinyin', 'vi', 'statement', 'statementPinyin', 'statementVi', 'explain'];
const isText = (s) => typeof s === 'string' && s.trim() !== '';

// Every problem in the listening data, as readable messages; [] when it is valid.
export function validateListening(data) {
  if (!data || !Array.isArray(data.parts)) return ['listening.json phải có mảng parts'];
  const errors = [];
  const seen = new Set();
  for (const part of data.parts) {
    const typeIds = (part.types || []).map((t) => t.id);
    const byType = {};
    for (const [i, q] of (part.questions || []).entries()) {
      const at = q && q.id ? q.id : `${part.id}[${i}]`;
      if (!q || typeof q !== 'object') {
        errors.push(`${at}: phải là object`);
        continue;
      }
      if (!/^p1-\d{3}$/.test(q.id)) errors.push(`${at}: id phải dạng p1-001`);
      else if (seen.has(q.id)) errors.push(`id trùng: ${q.id}`);
      seen.add(q.id);
      if (!typeIds.includes(q.type)) errors.push(`${at}: type ${JSON.stringify(q.type)} không có trong types`);
      if (q.voice !== 'f' && q.voice !== 'm') errors.push(`${at}: voice phải là "f" hoặc "m"`);
      if (typeof q.answer !== 'boolean') errors.push(`${at}: answer phải là true/false`);
      for (const f of TEXT_FIELDS) if (!isText(q[f])) errors.push(`${at}: thiếu ${f}`);
      (byType[q.type] ||= []).push(q.answer);
    }
    for (const [t, answers] of Object.entries(byType)) {
      if (answers.length >= 2 && answers.every((a) => a === answers[0])) errors.push(`dạng ${t}: mọi câu cùng đáp án ${answers[0]}`);
    }
  }
  return errors;
}
