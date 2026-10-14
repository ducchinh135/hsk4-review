// URL -> page mapping with no DOM or React, so Node tests can use it.
import { QUIZ_TYPES } from './quiz.js';

// Top-level sections shown in the sidebar. Add an entry here (and its pages below) for a new one.
export const SECTIONS = [
  { id: 'vocab', path: '/vocab/review', label: '📚 Từ vựng' },
  { id: 'grammar', path: '/grammar', label: '📖 Ngữ pháp' },
];

// Tabs inside the vocabulary section.
export const PAGES = [
  { page: 'words', path: '/vocab/words', label: '📚 Từ vựng' },
  { page: 'review', path: '/vocab/review', label: '📇 Ôn tập' },
  { page: 'practice', path: '/vocab/practice', label: '📝 Thực hành' },
];

// Tabs inside the grammar section.
export const GRAMMAR_PAGES = [
  { page: 'grammar', path: '/grammar', label: '📖 Lý thuyết' },
  { page: 'grammar-practice', path: '/grammar/practice', label: '📝 Luyện tập' },
];

export const PAGE_TITLES = {
  words: 'Từ vựng',
  review: 'Ôn tập',
  practice: 'Thực hành',
  exercise: 'Thực hành',
  grammar: 'Ngữ pháp',
  'grammar-practice': 'Luyện tập ngữ pháp',
  'grammar-review': 'Ôn ngữ pháp',
};

export const sectionOf = (page) => (page.startsWith('grammar') ? 'grammar' : 'vocab');

const EXERCISE_TYPES = QUIZ_TYPES.map(([t]) => t);
const SIMPLE = ['words', 'review'];

function matchVocab(parts) {
  const [a, b, ...rest] = parts;
  if (a === 'practice') {
    if (b && !rest.length && EXERCISE_TYPES.includes(b)) return { page: 'exercise', params: { type: b }, path: `/vocab/practice/${b}` };
    return { page: 'practice', params: {}, path: '/vocab/practice' };
  }
  if (SIMPLE.includes(a) && !b) return { page: a, params: {}, path: '/vocab/' + a };
  return { page: 'review', params: {}, path: '/vocab/review' };
}

function matchGrammar(parts) {
  const [a, ...rest] = parts;
  if (!rest.length && a === 'practice') return { page: 'grammar-practice', params: {}, path: '/grammar/practice' };
  if (!rest.length && a === 'review') return { page: 'grammar-review', params: {}, path: '/grammar/review' };
  return { page: 'grammar', params: {}, path: '/grammar' };
}

// Returns the page to render and the canonical path for it (the router replaces the URL with
// `path` when they differ, so unknown URLs end up on a real page). The pre-sidebar URLs
// (/words, /review, /practice/...) still work: they resolve to their /vocab/... page.
export function matchRoute(pathname) {
  const parts = String(pathname).split('/').filter(Boolean);
  if (parts[0] === 'grammar') return matchGrammar(parts.slice(1));
  return matchVocab(parts[0] === 'vocab' ? parts.slice(1) : parts);
}
