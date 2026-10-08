// Unit tests for URL -> page matching. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TYPES } from '../src/quiz.js';
import { PAGES, matchRoute } from '../src/routes.js';

const page = (p) => ({ page: p, params: {}, path: '/' + p });

test('matchRoute() maps the three pages', () => {
  assert.deepEqual(matchRoute('/words'), page('words'));
  assert.deepEqual(matchRoute('/review'), page('review'));
  assert.deepEqual(matchRoute('/practice'), page('practice'));
});

test('matchRoute() sends the root and unknown paths to /review', () => {
  for (const p of ['/', '', '/nope', '/index.html', '/Words', '/words/foo', '/daily', '/api/me']) {
    assert.deepEqual(matchRoute(p), page('review'), p);
  }
});

test('matchRoute() ignores trailing and doubled slashes', () => {
  assert.deepEqual(matchRoute('/words/'), page('words'));
  assert.deepEqual(matchRoute('//words'), page('words'));
  assert.deepEqual(matchRoute('/practice/'), page('practice'));
});

test('matchRoute() resolves every exercise type', () => {
  for (const [type] of QUIZ_TYPES) {
    assert.deepEqual(matchRoute('/practice/' + type), { page: 'exercise', params: { type }, path: '/practice/' + type });
  }
});

test('matchRoute() sends an unknown or over-long practice path to /practice', () => {
  assert.deepEqual(matchRoute('/practice/xyz'), page('practice'));
  assert.deepEqual(matchRoute('/practice/pinyin/extra'), page('practice'));
  assert.deepEqual(matchRoute('/practice/Pinyin'), page('practice'));
});

test('PAGES lists the three navigation entries in order', () => {
  assert.deepEqual(
    PAGES.map((p) => p.path),
    ['/words', '/review', '/practice']
  );
});
