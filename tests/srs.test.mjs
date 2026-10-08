// Unit tests for the spaced-repetition scheduler. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  buildQueue,
  KNOWN_IVL,
  enroll,
  known,
  lapse,
  newCard,
  preview,
  queueCounts,
  schedule,
  today,
} from '../src/srs.js';

const D = 20000;
const review = (o = {}) => ({ due: D, ivl: 4, ease: 2500, reps: 5, lapses: 0, added: D - 30, ...o });

test('today() rolls over at 4am local time', () => {
  const vn = -420; // UTC+7
  const before = today(Date.UTC(2026, 9, 7, 20, 59), vn); // 03:59 on Oct 8 in Vietnam
  const after = today(Date.UTC(2026, 9, 7, 21, 0), vn); // 04:00 on Oct 8 in Vietnam
  assert.equal(before, Date.UTC(2026, 9, 7) / DAY_MS);
  assert.equal(after, before + 1);
});

test('new card: Quên/Khó requeue in the session, Được/Dễ graduate to 1 and 4 days', () => {
  const again = schedule(undefined, 1, D);
  assert.deepEqual(again, { card: { ...newCard(D), reps: 1 }, requeue: 3 });
  assert.equal(schedule(undefined, 2, D).requeue, 6);
  assert.equal(schedule(undefined, 2, D).card.ivl, 0);
  const good = schedule(undefined, 3, D);
  assert.equal(good.requeue, 0);
  assert.equal(good.card.ivl, 1);
  assert.equal(good.card.due, D + 1);
  assert.equal(good.card.added, D);
  assert.equal(schedule(undefined, 4, D).card.ivl, 4);
  assert.equal(schedule(undefined, 4, D).card.ease, 2500, 'ease does not change while learning');
});

test('review card: the four grades', () => {
  const again = schedule(review(), 1, D);
  assert.equal(again.requeue, 3);
  assert.equal(again.card.ivl, 0);
  assert.equal(again.card.due, D);
  assert.equal(again.card.lapses, 1);
  assert.equal(again.card.ease, 2300);

  const hard = schedule(review(), 2, D).card;
  assert.deepEqual([hard.ivl, hard.due, hard.ease], [5, D + 5, 2350]);
  const good = schedule(review(), 3, D).card;
  assert.deepEqual([good.ivl, good.due, good.ease], [10, D + 10, 2500]);
  const easy = schedule(review(), 4, D).card;
  assert.deepEqual([easy.ivl, easy.due, easy.ease], [13, D + 13, 2650]);
  assert.equal(easy.reps, 6);
});

test('review card: interval always grows, ease and interval are clamped', () => {
  assert.equal(schedule(review({ ivl: 1, ease: 1300 }), 2, D).card.ivl, 2);
  assert.equal(schedule(review({ ease: 1400 }), 1, D).card.ease, 1300);
  assert.equal(schedule(review({ ease: 4900 }), 4, D).card.ease, 5000);
  assert.equal(schedule(review({ ivl: 300 }), 3, D).card.ivl, 365);
  assert.equal(schedule(review({ ivl: 365 }), 2, D).card.ivl, 365);
});

test('a relearned card graduates from 1 day again', () => {
  const lapsed = schedule(review({ ivl: 40 }), 1, D).card;
  assert.equal(schedule(lapsed, 3, D).card.ivl, 1);
});

test('preview() labels each button with the next interval', () => {
  assert.deepEqual(preview(undefined, D), ['lại ngay', 'lát nữa', '1 ngày', '4 ngày']);
  assert.deepEqual(preview(review(), D), ['lại ngay', '5 ngày', '10 ngày', '13 ngày']);
  assert.equal(preview(review({ ivl: 30 }), D)[2], '3 tháng'); // 75 days
});

test('lapse(): new card becomes a learning card due today, review card is forgotten', () => {
  assert.deepEqual(lapse(undefined, D), newCard(D));
  const learning = { ...newCard(D - 1), reps: 2 };
  assert.deepEqual(lapse(learning, D), learning, 'learning card already due stays as is');
  assert.equal(lapse({ ...learning, due: D + 3 }, D).due, D);
  const forgotten = lapse(review({ ivl: 20, due: D + 9 }), D);
  assert.deepEqual(forgotten, review({ ivl: 0, due: D, lapses: 1, ease: 2300 }));
});

test('buildQueue(): overdue reviews first (most overdue first), then learning cards; unseen words never', () => {
  const words = ['a', 'b', 'c', 'd', 'e', 'f', 'a'];
  const srs = {
    b: review({ due: D - 2 }),
    c: review({ due: D - 5 }),
    d: { ...newCard(D - 1), reps: 1 },
    e: review({ due: D + 3 }),
  };
  assert.deepEqual(buildQueue(srs, words, D), ['c', 'b', 'd']);
  assert.deepEqual(buildQueue({ ...srs, a: newCard(D) }, words, D), ['c', 'b', 'a', 'd'], 'enrolled word, duplicate hanzi once');
  assert.deepEqual(buildQueue({}, words, D), []);
});

test('queueCounts(): due, learning, tomorrow and how many words are in the schedule', () => {
  const srs = {
    b: review({ due: D - 2 }),
    c: review({ due: D + 1 }),
    d: newCard(D),
    e: review({ due: D + 1 }),
  };
  assert.deepEqual(queueCounts(srs, ['a', 'b', 'c', 'd', 'e', 'f', 'g'], D), { due: 1, learning: 1, tomorrow: 2, enrolled: 4 });
  assert.deepEqual(queueCounts({}, ['a'], D), { due: 0, learning: 0, tomorrow: 0, enrolled: 0 });
});

test('enroll(): an unseen word becomes a learning card due today, an existing card is untouched', () => {
  assert.deepEqual(enroll(undefined, D), newCard(D));
  const c = review({ due: D + 9 });
  assert.equal(enroll(c, D), c);
});

test('known(): marking an unseen word as known schedules it a week out, an existing card is untouched', () => {
  assert.deepEqual(known(undefined, D), { ...newCard(D), ivl: KNOWN_IVL, due: D + KNOWN_IVL, reps: 1 });
  assert.equal(KNOWN_IVL, 7);
  const c = review({ due: D + 2 });
  assert.equal(known(c, D), c);
});
