// Spaced repetition: Anki-style SM-2 at day granularity. Pure functions, no React or storage.
// A card is { due, ivl, ease, reps, lapses, added } (+ `t`, the edit time, added by useSrs).
//   due/added: day numbers from today(); ivl: days, 0 = learning; ease: factor x 1000.

export const DAY_MS = 86_400_000;
const ROLLOVER_MS = 4 * 3_600_000; // a study day ends at 4am local time
export const EASE_START = 2500;
export const EASE_MIN = 1300;
export const EASE_MAX = 5000;
export const IVL_MAX = 365;
export const KNOWN_IVL = 7; // a word marked "known" first comes back after a week
const GRADES = [1, 2, 3, 4]; // Quên, Khó, Được, Dễ

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function today(now = Date.now(), tzOffsetMin = new Date(now).getTimezoneOffset()) {
  return Math.floor((now - tzOffsetMin * 60_000 - ROLLOVER_MS) / DAY_MS);
}

export const newCard = (day) => ({ due: day, ivl: 0, ease: EASE_START, reps: 0, lapses: 0, added: day });

// Returns the graded card and, for cards still being learned, how many cards later
// it should come back in the current session (0 = not again this session).
export function schedule(card, grade, day) {
  const c = { ...(card || newCard(day)) };
  c.reps += 1;
  let requeue = 0;
  if (c.ivl === 0) {
    if (grade <= 2) {
      c.due = day;
      requeue = grade === 1 ? 3 : 6;
    } else {
      c.ivl = grade === 3 ? 1 : 4;
      c.due = day + c.ivl;
    }
    return { card: c, requeue };
  }
  if (grade === 1) {
    c.ivl = 0;
    c.due = day;
    c.lapses += 1;
    c.ease = clamp(c.ease - 200, EASE_MIN, EASE_MAX);
    return { card: c, requeue: 3 };
  }
  const f = c.ease / 1000;
  const raw = grade === 2 ? c.ivl * 1.2 : grade === 3 ? c.ivl * f : c.ivl * f * 1.3;
  c.ivl = Math.min(IVL_MAX, Math.max(c.ivl + 1, Math.round(raw)));
  c.ease = clamp(c.ease + (grade === 2 ? -150 : grade === 4 ? 150 : 0), EASE_MIN, EASE_MAX);
  c.due = day + c.ivl;
  return { card: c, requeue };
}

const intervalLabel = (days) => (days < 30 ? days + ' ngày' : Math.round(days / 30) + ' tháng');

// Button captions: what each grade would do to this card.
export function preview(card, day) {
  return GRADES.map((g) => {
    const { card: c, requeue } = schedule(card, g, day);
    if (requeue) return requeue <= 3 ? 'lại ngay' : 'lát nữa';
    return intervalLabel(c.ivl);
  });
}

// A wrong quiz answer: bring the word back into today's review.
export function lapse(card, day) {
  if (!card) return newCard(day);
  if (card.ivl === 0) return card.due <= day ? card : { ...card, due: day };
  return { ...card, ivl: 0, due: day, lapses: card.lapses + 1, ease: clamp(card.ease - 200, EASE_MIN, EASE_MAX) };
}

// Entering the schedule. A word only has a card once you have studied it (marked it, got it wrong in
// an exercise, or added its lesson), so the daily review never hands you words you have not met.
export const enroll = (card, day) => card || newCard(day);
export const known = (card, day) => card || { ...newCard(day), ivl: KNOWN_IVL, due: day + KNOWN_IVL, reps: 1 };

function split(srs, hanzi, day) {
  const due = [];
  const learning = [];
  let enrolled = 0;
  let tomorrow = 0;
  for (const h of new Set(hanzi)) {
    const c = srs[h];
    if (!c) continue;
    enrolled++;
    if (c.due <= day) (c.ivl > 0 ? due : learning).push(h);
    else if (c.ivl > 0 && c.due === day + 1) tomorrow++;
  }
  return { due, learning, enrolled, tomorrow };
}

// Today's session: every card that is due (most overdue first), then the learning cards.
export function buildQueue(srs, hanzi, day) {
  const { due, learning } = split(srs, hanzi, day);
  due.sort((a, b) => srs[a].due - srs[b].due); // stable: ties keep lesson order
  return [...due, ...learning];
}

export function queueCounts(srs, hanzi, day) {
  const { due, learning, enrolled, tomorrow } = split(srs, hanzi, day);
  return { due: due.length, learning: learning.length, tomorrow, enrolled };
}
