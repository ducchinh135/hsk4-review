// Unit tests for URL -> page matching. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TYPES } from '../src/quiz.js';
import { PAGES, SECTIONS, matchRoute, sectionOf } from '../src/routes.js';

const page = (p) => ({ page: p, params: {}, path: '/vocab/' + p });

test('matchRoute() maps the vocabulary pages', () => {
  assert.deepEqual(matchRoute('/vocab/words'), page('words'));
  assert.deepEqual(matchRoute('/vocab/review'), page('review'));
  assert.deepEqual(matchRoute('/vocab/practice'), page('practice'));
});

test('matchRoute() maps the grammar page', () => {
  assert.deepEqual(matchRoute('/grammar'), { page: 'grammar', params: {}, path: '/grammar' });
  assert.deepEqual(matchRoute('/grammar/x'), { page: 'grammar', params: {}, path: '/grammar' });
});

test('matchRoute() redirects the old pre-sidebar URLs into /vocab', () => {
  assert.deepEqual(matchRoute('/words'), page('words'));
  assert.deepEqual(matchRoute('/review'), page('review'));
  assert.deepEqual(matchRoute('/practice'), page('practice'));
  assert.deepEqual(matchRoute('/practice/pinyin'), { page: 'exercise', params: { type: 'pinyin' }, path: '/vocab/practice/pinyin' });
});

test('matchRoute() sends the root and unknown paths to /vocab/review', () => {
  for (const p of ['/', '', '/nope', '/index.html', '/Words', '/words/foo', '/daily', '/api/me', '/vocab']) {
    assert.deepEqual(matchRoute(p), page('review'), p);
  }
});

test('matchRoute() ignores trailing and doubled slashes', () => {
  assert.deepEqual(matchRoute('/vocab/words/'), page('words'));
  assert.deepEqual(matchRoute('//vocab//words'), page('words'));
  assert.deepEqual(matchRoute('/vocab/practice/'), page('practice'));
});

test('matchRoute() resolves every exercise type', () => {
  for (const [type] of QUIZ_TYPES) {
    assert.deepEqual(matchRoute('/vocab/practice/' + type), { page: 'exercise', params: { type }, path: '/vocab/practice/' + type });
  }
});

test('matchRoute() sends an unknown or over-long practice path to /vocab/practice', () => {
  assert.deepEqual(matchRoute('/vocab/practice/xyz'), page('practice'));
  assert.deepEqual(matchRoute('/vocab/practice/pinyin/extra'), page('practice'));
  assert.deepEqual(matchRoute('/vocab/practice/Pinyin'), page('practice'));
});

test('PAGES and SECTIONS list the navigation entries in order', () => {
  assert.deepEqual(PAGES.map((p) => p.path), ['/vocab/words', '/vocab/review', '/vocab/practice']);
  assert.deepEqual(SECTIONS.map((s) => s.id), ['vocab', 'grammar']);
  for (const s of SECTIONS) assert.equal(matchRoute(s.path).path, s.path);
});

test('sectionOf() groups pages by section', () => {
  assert.equal(sectionOf('grammar'), 'grammar');
  for (const p of ['words', 'review', 'practice', 'exercise']) assert.equal(sectionOf(p), 'vocab');
});
