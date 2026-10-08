// Quiz questions and pinyin checking. Pure functions; a word is [hanzi, pinyin, meaning, example zh, example vi].
import { shuffle } from './random.js';

export const QUIZ_TYPES = [
  ['meaning', 'Hán tự → nghĩa'],
  ['hanzi', 'Nghĩa → Hán tự'],
  ['listen', 'Nghe → chọn từ'],
  ['pinyin', 'Gõ pinyin'],
  ['fill', 'Điền từ vào câu'],
];

export function applicableTypes(word, types, { canSpeak }) {
  return QUIZ_TYPES.map(([t]) => t).filter(
    (t) => types.includes(t) && (t !== 'fill' || word[3].includes(word[0])) && (t !== 'listen' || canSpeak)
  );
}

// Questions per practice run.
export const PRACTICE_COUNT = 20;

// How many of the words this one exercise type can ask about.
export function countApplicable(words, type, { canSpeak }) {
  return words.filter((w) => applicableTypes(w, [type], { canSpeak }).length > 0).length;
}

const shown = (type) => (type === 'meaning' ? (w) => w[2] : (w) => w[0]);

// The answer plus 3 distractors, same lesson first, never two options with the same text.
function pickOptions(word, show, lessonWords, allWords, rng) {
  const seen = new Set([show(word)]);
  const out = [];
  for (const pool of [lessonWords, allWords]) {
    for (const w of shuffle(pool, rng)) {
      if (out.length === 3) break;
      const s = show(w);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return shuffle([show(word), ...out], rng);
}

export function makeQuestion(word, type, lessonWords, allWords, rng = Math.random) {
  if (type === 'pinyin') return { type, word, answer: word[1] };
  const show = shown(type);
  return { type, word, answer: show(word), options: pickOptions(word, show, lessonWords, allWords, rng) };
}

// One question per word, each with a random type among the chosen ones that fit the word.
export function buildQuiz(words, { types, count }, lessonWords, allWords, { canSpeak = true, rng = Math.random } = {}) {
  const n = count === 'all' ? words.length : Math.min(count, words.length);
  const out = [];
  for (const w of shuffle(words, rng)) {
    if (out.length === n) break;
    const ok = applicableTypes(w, types, { canSpeak });
    if (ok.length) out.push(makeQuestion(w, ok[Math.floor(rng() * ok.length)], lessonWords, allWords, rng));
  }
  return out;
}

const MARKED = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
const TONE_OF = {};
for (const [base, chars] of Object.entries(MARKED)) [...chars].forEach((ch, i) => (TONE_OF[ch] = [base, String(i + 1)]));

// Letters without tones, plus the tones in order: 'fǎlǜ' and 'fa3lv4' both give { letters: 'falü', tones: '34' }.
// Neutral tone has no number (a typed 5 is dropped).
export function pinyinKey(str) {
  const s = String(str).normalize('NFC').toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü').replace(/[\s'’\-·]/g, '');
  let letters = '';
  let tones = '';
  for (const ch of s) {
    if (TONE_OF[ch]) {
      letters += TONE_OF[ch][0];
      tones += TONE_OF[ch][1];
    } else if (ch >= '1' && ch <= '4') tones += ch;
    else if (ch !== '5' && ch !== '0') letters += ch;
  }
  return { letters, tones };
}

export function checkPinyin(input, answer, { tones = true } = {}) {
  const a = pinyinKey(input);
  const b = pinyinKey(answer);
  if (!a.letters || a.letters !== b.letters) return 'wrong';
  if (tones && a.tones !== b.tones) return 'tone';
  return 'ok';
}
