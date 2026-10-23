// Unit tests for choosing the browser's Mandarin voice. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice } from '../src/voice.js';

const v = (name, lang, localService = true) => ({ name, lang, localService });

// The voice list of Chrome on macOS: the Eloquence voices (Eddy, Flo, …) come first and sound robotic.
const MAC_CHROME = [
  v('Eddy (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Eddy (Tiếng Trung (Đài Loan))', 'zh-TW'),
  v('Flo (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Grandma (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Grandpa (Chinese (China mainland))', 'zh-CN'),
  v('Reed (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Rocko (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Sandy (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Shelley (Tiếng Trung (Trung Quốc đại lục))', 'zh-CN'),
  v('Li-Mu', 'zh-CN'),
  v('Meijia', 'zh-TW'),
  v('Sinji', 'zh-HK'),
  v('Tingting', 'zh-CN'),
  v('Google 普通话（中国大陆）', 'zh-CN', false),
  v('Samantha', 'en-US'),
];

test('pickVoice() skips the robotic Eloquence voices and takes Tingting on macOS', () => {
  assert.equal(pickVoice(MAC_CHROME).name, 'Tingting');
});

test('pickVoice() prefers a neural "Natural" voice (Edge) over the others', () => {
  const vs = [v('Microsoft Kangkang - Chinese (Simplified, PRC)', 'zh-CN'), v('Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', 'zh-CN', false), v('Tingting', 'zh-CN')];
  assert.equal(pickVoice(vs).name, 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)');
});

test('pickVoice() takes Google 普通话 when no good local voice exists', () => {
  const vs = [v('Eddy (Chinese (China mainland))', 'zh-CN'), v('Google 普通话（中国大陆）', 'zh-CN', false), v('Google 國語（臺灣）', 'zh-TW', false)];
  assert.equal(pickVoice(vs).name, 'Google 普通话（中国大陆）');
});

test('pickVoice() takes a mainland voice before Taiwan / Hong Kong ones', () => {
  const vs = [v('Meijia', 'zh-TW'), v('Sinji', 'zh-HK'), v('Chinese China', 'zh_CN')];
  assert.equal(pickVoice(vs).name, 'Chinese China');
});

test('pickVoice() falls back to an Eloquence voice rather than none, and returns null without Chinese', () => {
  assert.equal(pickVoice([v('Samantha', 'en-US'), v('Flo (Chinese (China mainland))', 'zh-CN')]).name, 'Flo (Chinese (China mainland))');
  assert.equal(pickVoice([v('Samantha', 'en-US')]), null);
  assert.equal(pickVoice([]), null);
});
