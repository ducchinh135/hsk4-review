// Reading practice (HSK4 exam parts 选词填空, 排列顺序 and 阅读理解): sets, runs and validation, with
// no React so Node tests can use them.
import RAW from './data/reading.json' with { type: 'json' };

// The three parts of the exam's reading section; only those in reading.json have content.
export const PART_TABS = [
  { id: 'p1', label: '① 选词填空' },
  { id: 'p2', label: '② 排列顺序' },
  { id: 'p3', label: '③ 阅读理解' },
];

export const PARTS = RAW.parts;
export const partById = (id) => PARTS.find((p) => p.id === id);

export const readKey = (id) => 'r:' + id;
export const LETTERS6 = ['A', 'B', 'C', 'D', 'E', 'F'];

// What a run steps through: the sets of a fill part.
export function unitsOf(part, typeId) {
  const all = part.sets || [];
  return typeId ? all.filter((u) => u.type === typeId) : all;
}

export function typeCount(part) {
  const n = Object.fromEntries(part.types.map((t) => [t.id, 0]));
  for (const u of unitsOf(part)) n[u.type] = (n[u.type] || 0) + 1;
  return n;
}

const FORMATS = ['fill'];
const BLANK = '___';
const isText = (s) => typeof s === 'string' && s.trim() !== '';
const blanks = (s) => (typeof s === 'string' ? s.split(BLANK).length - 1 : 0);
const isWordIndex = (a) => Number.isInteger(a) && a >= 0 && a < 6;

function checkDialogue(item, at, errors) {
  for (const f of ['text', 'pinyin', 'vi']) {
    const lines = String(item[f]).split('\n');
    if (lines.length !== 2) errors.push(`${at}: câu hội thoại phải có đúng 2 dòng (${f})`);
    else if (f === 'text' && !lines.every((l, i) => l.startsWith(i === 0 ? 'A：' : 'B：') || l.startsWith(i === 0 ? 'B：' : 'A：')))
      errors.push(`${at}: mỗi dòng hội thoại phải bắt đầu bằng "A：" hoặc "B："`);
  }
}

// Checks one fill set; returns its answer sequence (example first) for the per-type check.
function checkFill(set, at, errors, isDialogue) {
  if (!Array.isArray(set.words) || set.words.length !== 6) errors.push(`${at}: words phải có đúng 6 từ`);
  else {
    set.words.forEach((w, i) => {
      for (const f of ['text', 'pinyin', 'vi']) if (!w || !isText(w[f])) errors.push(`${at}: words[${i}] thiếu ${f}`);
    });
    const texts = set.words.map((w) => w && w.text);
    if (new Set(texts).size !== texts.length) errors.push(`${at}: các từ phải khác nhau`);
  }
  const ex = set.example;
  if (!ex || blanks(ex.text) !== 1) errors.push(`${at}: example.text phải có đúng một ___`);
  if (!ex || !isWordIndex(ex.answer)) errors.push(`${at}: example.answer phải là số nguyên 0–5`);
  const answers = [ex && ex.answer];
  if (!Array.isArray(set.items) || set.items.length !== 5) errors.push(`${at}: items phải có đúng 5 câu`);
  else {
    set.items.forEach((item, i) => {
      const iat = `${at} câu ${i + 1}`;
      for (const f of ['text', 'pinyin', 'vi', 'explain']) if (!item || !isText(item[f])) errors.push(`${iat}: thiếu ${f}`);
      if (!item) return;
      if (blanks(item.text) !== 1) errors.push(`${iat}: text phải có đúng một ___`);
      if (!isWordIndex(item.answer)) errors.push(`${iat}: answer phải là số nguyên 0–5`);
      if (isDialogue && isText(item.text)) checkDialogue(item, iat, errors);
      answers.push(item.answer);
    });
    if (new Set(answers).size !== answers.length) errors.push(`${at}: đáp án của câu 例如 và 5 câu phải là 6 từ khác nhau`);
  }
  return answers.join(',');
}

// Every problem in the reading data, as readable messages; [] when it is valid.
export function validateReading(data) {
  if (!data || !Array.isArray(data.parts)) return ['reading.json phải có mảng parts'];
  const errors = [];
  const seen = new Set();
  for (const part of data.parts) {
    if (!FORMATS.includes(part.format)) {
      errors.push(`${part.id}: format phải là một trong ${FORMATS.join(', ')}`);
      continue;
    }
    const typeIds = (part.types || []).map((t) => t.id);
    const idPattern = new RegExp(`^${part.id}-\\d{3}$`);
    const byType = {};
    for (const [i, u] of unitsOf(part).entries()) {
      const at = u && u.id ? u.id : `${part.id}[${i}]`;
      if (!u || typeof u !== 'object') {
        errors.push(`${at}: phải là object`);
        continue;
      }
      if (!idPattern.test(u.id)) errors.push(`${at}: id phải dạng ${part.id}-001`);
      else if (seen.has(u.id)) errors.push(`id trùng: ${u.id}`);
      seen.add(u.id);
      if (!typeIds.includes(u.type)) errors.push(`${at}: type ${JSON.stringify(u.type)} không có trong types`);
      (byType[u.type] ||= []).push(checkFill(u, at, errors, u.type === 'dialogue'));
    }
    for (const [t, answers] of Object.entries(byType)) {
      if (answers.length >= 2 && answers.every((a) => a === answers[0])) errors.push(`dạng ${t}: mọi bộ cùng một dãy đáp án`);
    }
  }
  return errors;
}
