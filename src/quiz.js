// Quiz questions and pinyin checking. Pure functions; a word is [hanzi, pinyin, meaning, example zh, example vi].
import { shuffle } from './random.js';

export const QUIZ_TYPES = [
  ['meaning', 'Hán tự → nghĩa'],
  ['hanzi', 'Nghĩa → Hán tự'],
  ['listen', 'Nghe → chọn từ'],
  ['pinyin', 'Gõ pinyin'],
  ['fill', 'Điền từ vào câu'],
];

export function variantsForWord(word, type, { canSpeak = true, scope = 'all' } = {}) {
  if (type === 'listen' && !canSpeak) return [];
  if (type === 'fill') {
    const sentences = [[word[3], word[4] || ''], ...(word[6] || [])];
    return sentences
      .filter(([zh]) => zh && zh.includes(word[0]))
      .map(([sentence, sentenceVi]) => ({
        type: 'fill',
        word,
        target: [word[0], word[1], word[2]],
        sentence,
        sentenceVi,
        isPhrase: false,
      }));
  }
  if (!QUIZ_TYPES.some(([t]) => t === type)) return [];
  const base = { type, word, target: [word[0], word[1], word[2]], isPhrase: false };
  const phrases = (word[5] || []).map((p) => ({
    type,
    word,
    target: [p[0], p[1], p[2]],
    isPhrase: true,
  }));
  if (scope === 'core') return [base];
  if (scope === 'phrases') return phrases;
  return [base, ...phrases];
}

export function applicableTypes(word, types, { canSpeak }) {
  return QUIZ_TYPES.map(([t]) => t).filter((t) => types.includes(t) && variantsForWord(word, t, { canSpeak }).length > 0);
}

// Default questions per practice run.
export const PRACTICE_COUNT = 20;

// How many of the words this one exercise type can ask about.
export function countApplicable(words, type, { canSpeak }) {
  return words.filter((w) => applicableTypes(w, [type], { canSpeak }).length > 0).length;
}

// Total number of distinct questions available for this exercise type and scope ('core' | 'phrases' | 'all').
export function countQuestions(words, type, { canSpeak, scope = 'all' } = {}) {
  return words.reduce((sum, w) => sum + variantsForWord(w, type, { canSpeak, scope }).length, 0);
}

const shown = (type) => (type === 'meaning' ? (w) => w[2] : (w) => w[0]);

// The answer plus 3 distractors, same lesson first, matching phrase/word style first, never two options with the same text.
function pickOptions(target, isPhrase, show, lessonWords, allWords, rng) {
  const seen = new Set([show(target)]);
  const out = [];
  const phrasePool = (ws) => ws.flatMap((w) => w[5] || []);
  const pools = isPhrase
    ? [phrasePool(lessonWords), phrasePool(allWords), lessonWords, allWords]
    : [lessonWords, allWords];
  for (const pool of pools) {
    for (const item of shuffle(pool, rng)) {
      if (out.length === 3) break;
      const s = show(item);
      if (s && !seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return shuffle([show(target), ...out], rng);
}

export function makeQuestion(word, type, lessonWords, allWords, rng = Math.random, variant = null) {
  const v =
    variant ||
    variantsForWord(word, type, { canSpeak: true })[0] || {
      type,
      word,
      target: [word[0], word[1], word[2]],
      sentence: word[3],
      sentenceVi: word[4] || '',
      isPhrase: false,
      isExtended: false,
    };
  if (type === 'pinyin') {
    return { type, word, target: v.target, isPhrase: v.isPhrase, isExtended: !!v.isExtended, answer: v.target[1] };
  }
  const show = shown(type);
  const q = {
    type,
    word,
    target: v.target,
    isPhrase: v.isPhrase,
    isExtended: !!v.isExtended,
    answer: show(v.target),
    options: pickOptions(v.target, v.isPhrase, show, lessonWords, allWords, rng),
  };
  if (type === 'fill') {
    q.sentence = v.sentence ?? word[3];
    q.sentenceVi = v.sentenceVi ?? (word[4] || '');
  }
  return q;
}

// Builds up to `count` questions: Pass 0 always uses the core word/sentence (questions 1..W),
// and subsequent passes use the expanded phrases/sentences (questions W+1..end).
export function buildQuiz(words, { types, count, scope = 'all' }, lessonWords, allWords, { canSpeak = true, rng = Math.random } = {}) {
  const wordBuckets = [];
  let totalVariants = 0;
  for (const w of shuffle(words, rng)) {
    const ok = applicableTypes(w, types, { canSpeak });
    if (!ok.length) continue;
    const chosenType = ok.length === 1 ? ok[0] : ok[Math.floor(rng() * ok.length)];
    const raw = variantsForWord(w, chosenType, { canSpeak, scope });
    if (raw.length) {
      const vs =
        raw.length > 1
          ? [
              { ...raw[0], isExtended: false },
              ...shuffle(raw.slice(1), rng).map((item) => ({ ...item, isExtended: true })),
            ]
          : [{ ...raw[0], isExtended: scope === 'phrases' }];
      wordBuckets.push({ word: w, vs });
      totalVariants += vs.length;
    }
  }
  const limit = count === 'all' ? totalVariants : Math.min(count, totalVariants);
  const out = [];
  let pass = 0;
  while (out.length < limit) {
    const ordered = pass === 0 ? wordBuckets : shuffle(wordBuckets, rng);
    let addedInPass = false;
    for (const b of ordered) {
      if (out.length === limit) break;
      if (pass < b.vs.length) {
        const v = b.vs[pass];
        out.push(makeQuestion(b.word, v.type, lessonWords, allWords, rng, v));
        addedInPass = true;
      }
    }
    if (!addedInPass) break;
    pass++;
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
