// Unit tests for URL -> page matching. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TYPES } from '../src/quiz.js';
import { COMPARE_PAGES, GRAMMAR_PAGES, PAGES, PAGE_TITLES, SECTIONS, matchRoute, sectionOf } from '../src/routes.js';

const page = (p) => ({ page: p, params: {}, path: '/vocab/' + p });

test('matchRoute() maps the vocabulary pages', () => {
  assert.deepEqual(matchRoute('/vocab/words'), page('words'));
  assert.deepEqual(matchRoute('/vocab/review'), page('review'));
  assert.deepEqual(matchRoute('/vocab/practice'), page('practice'));
});

const gpage = (p, path) => ({ page: p, params: {}, path });

test('matchRoute() maps the grammar pages', () => {
  assert.deepEqual(matchRoute('/grammar'), gpage('grammar', '/grammar'));
  assert.deepEqual(matchRoute('/grammar/'), gpage('grammar', '/grammar'));
  assert.deepEqual(matchRoute('/grammar/practice'), gpage('grammar-practice', '/grammar/practice'));
  assert.deepEqual(matchRoute('/grammar/review'), gpage('grammar-review', '/grammar/review'));
  assert.deepEqual(matchRoute('//grammar//practice/'), gpage('grammar-practice', '/grammar/practice'));
});

test('matchRoute() sends unknown grammar paths to /grammar', () => {
  for (const p of ['/grammar/x', '/grammar/xyz', '/grammar/practice/1', '/grammar/Practice', '/grammar/review/x']) {
    assert.deepEqual(matchRoute(p), gpage('grammar', '/grammar'), p);
  }
});

test('GRAMMAR_PAGES lists the grammar tabs, and every page has a title', () => {
  assert.deepEqual(GRAMMAR_PAGES.map((p) => p.path), ['/grammar', '/grammar/practice']);
  for (const p of GRAMMAR_PAGES) assert.equal(matchRoute(p.path).page, p.page);
  for (const p of ['words', 'review', 'practice', 'exercise', 'grammar', 'grammar-practice', 'grammar-review']) assert.ok(PAGE_TITLES[p], p);
});

test('matchRoute() maps the compare pages', () => {
  assert.deepEqual(matchRoute('/compare'), gpage('compare', '/compare'));
  assert.deepEqual(matchRoute('/compare/'), gpage('compare', '/compare'));
  assert.deepEqual(matchRoute('/compare/practice'), gpage('compare-practice', '/compare/practice'));
  assert.deepEqual(matchRoute('/compare/review'), gpage('compare-review', '/compare/review'));
  assert.deepEqual(matchRoute('//compare//review/'), gpage('compare-review', '/compare/review'));
});

test('matchRoute() sends unknown compare paths to /compare', () => {
  for (const p of ['/compare/x', '/compare/practice/1', '/compare/Practice', '/compare/review/x', '/compare/grammar']) {
    assert.deepEqual(matchRoute(p), gpage('compare', '/compare'), p);
  }
});

test('COMPARE_PAGES lists the compare tabs, and every page has a title', () => {
  assert.deepEqual(COMPARE_PAGES.map((p) => p.path), ['/compare', '/compare/practice']);
  for (const p of COMPARE_PAGES) assert.equal(matchRoute(p.path).page, p.page);
  for (const p of ['compare', 'compare-practice', 'compare-review']) assert.ok(PAGE_TITLES[p], p);
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
  assert.deepEqual(SECTIONS.map((s) => s.id), ['vocab', 'grammar', 'compare', 'listening', 'reading']);
  for (const s of SECTIONS) assert.equal(matchRoute(s.path).path, s.path);
});

test('sectionOf() groups pages by section', () => {
  for (const p of ['grammar', 'grammar-practice', 'grammar-review']) assert.equal(sectionOf(p), 'grammar');
  for (const p of ['compare', 'compare-practice', 'compare-review']) assert.equal(sectionOf(p), 'compare');
  for (const p of ['words', 'review', 'practice', 'exercise']) assert.equal(sectionOf(p), 'vocab');
  for (const p of ['listening-hub', 'listening-tips', 'listening-practice', 'listening-review']) assert.equal(sectionOf(p), 'listening');
});

const lpage = (page, params, path) => ({ page, params, path });
const HUB = lpage('listening-hub', { part: 'p1' }, '/listening/p1');

test('matchRoute() maps the listening pages', () => {
  assert.deepEqual(matchRoute('/listening'), HUB);
  assert.deepEqual(matchRoute('/listening/'), HUB);
  assert.deepEqual(matchRoute('/listening/p1'), HUB);
  assert.deepEqual(matchRoute('/listening/p1/tips'), lpage('listening-tips', { part: 'p1' }, '/listening/p1/tips'));
  assert.deepEqual(matchRoute('/listening/p1/review'), lpage('listening-review', { part: 'p1' }, '/listening/p1/review'));
  for (const type of ['detail', 'attitude', 'infer', 'mix']) {
    assert.deepEqual(matchRoute('/listening/p1/practice/' + type), lpage('listening-practice', { part: 'p1', type }, '/listening/p1/practice/' + type));
  }
  assert.deepEqual(matchRoute('//listening//p1//tips/'), lpage('listening-tips', { part: 'p1' }, '/listening/p1/tips'));
});

test('matchRoute() sends unknown listening paths to the Part 1 hub', () => {
  for (const p of ['/listening/p4', '/listening/p3/practice/xyz', '/listening/p2/practice/xyz', '/listening/p1/practice/xyz', '/listening/p1/practice', '/listening/p1/tips/x', '/listening/P1', '/listening/p1/review/1', '/listening/x/y/z']) {
    assert.deepEqual(matchRoute(p), HUB, p);
  }
});

test('every listening page has a title', () => {
  for (const p of ['listening-hub', 'listening-tips', 'listening-practice', 'listening-review']) assert.ok(PAGE_TITLES[p], p);
});

test('matchRoute() maps the Part 2 listening pages', () => {
  assert.deepEqual(matchRoute('/listening/p2'), lpage('listening-hub', { part: 'p2' }, '/listening/p2'));
  assert.deepEqual(matchRoute('/listening/p2/tips'), lpage('listening-tips', { part: 'p2' }, '/listening/p2/tips'));
  assert.deepEqual(matchRoute('/listening/p2/review'), lpage('listening-review', { part: 'p2' }, '/listening/p2/review'));
  for (const type of ['detail', 'reason', 'attitude', 'infer', 'mix']) {
    assert.deepEqual(matchRoute('/listening/p2/practice/' + type), lpage('listening-practice', { part: 'p2', type }, '/listening/p2/practice/' + type));
  }
  // Part 1 types are not Part 2 types
  assert.deepEqual(matchRoute('/listening/p2/practice/xyz'), HUB);
});

const RHUB = lpage('reading-hub', { part: 'p1' }, '/reading/p1');

test('sectionOf() puts the reading pages in the reading section', () => {
  for (const p of ['reading-hub', 'reading-tips', 'reading-practice', 'reading-review']) assert.equal(sectionOf(p), 'reading');
});

test('matchRoute() maps the reading pages', () => {
  assert.deepEqual(matchRoute('/reading'), RHUB);
  assert.deepEqual(matchRoute('/reading/'), RHUB);
  assert.deepEqual(matchRoute('/reading/p1'), RHUB);
  assert.deepEqual(matchRoute('/reading/p1/tips'), lpage('reading-tips', { part: 'p1' }, '/reading/p1/tips'));
  assert.deepEqual(matchRoute('/reading/p1/review'), lpage('reading-review', { part: 'p1' }, '/reading/p1/review'));
  for (const type of ['sentence', 'dialogue', 'mix']) {
    assert.deepEqual(matchRoute('/reading/p1/practice/' + type), lpage('reading-practice', { part: 'p1', type }, '/reading/p1/practice/' + type));
  }
  assert.deepEqual(matchRoute('//reading//p1//tips/'), lpage('reading-tips', { part: 'p1' }, '/reading/p1/tips'));
});

test('matchRoute() sends unknown reading paths to the Part 1 hub', () => {
  for (const p of ['/reading/p2', '/reading/p4', '/reading/p1/practice/xyz', '/reading/p1/practice', '/reading/p1/tips/x', '/reading/P1', '/reading/p1/review/1', '/reading/x/y/z']) {
    assert.deepEqual(matchRoute(p), RHUB, p);
  }
});

test('every reading page has a title', () => {
  for (const p of ['reading-hub', 'reading-tips', 'reading-practice', 'reading-review']) assert.ok(PAGE_TITLES[p], p);
});
