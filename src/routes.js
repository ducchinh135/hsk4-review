// URL -> page mapping with no DOM or React, so Node tests can use it.
import { QUIZ_TYPES } from './quiz.js';

export const PAGES = [
  { page: 'words', path: '/words', label: '📚 Từ vựng' },
  { page: 'review', path: '/review', label: '📇 Ôn tập' },
  { page: 'practice', path: '/practice', label: '📝 Thực hành' },
];

export const PAGE_TITLES = {
  words: 'Từ vựng',
  review: 'Ôn tập',
  practice: 'Thực hành',
  exercise: 'Thực hành',
};

const EXERCISE_TYPES = QUIZ_TYPES.map(([t]) => t);
const SIMPLE = ['words', 'review'];

// Returns the page to render and the canonical path for it (the router replaces the URL with
// `path` when they differ, so unknown URLs end up on a real page).
export function matchRoute(pathname) {
  const [a, b, ...rest] = String(pathname).split('/').filter(Boolean);
  if (a === 'practice') {
    if (b && !rest.length && EXERCISE_TYPES.includes(b)) return { page: 'exercise', params: { type: b }, path: `/practice/${b}` };
    return { page: 'practice', params: {}, path: '/practice' };
  }
  if (SIMPLE.includes(a) && !b) return { page: a, params: {}, path: '/' + a };
  return { page: 'review', params: {}, path: '/review' };
}
