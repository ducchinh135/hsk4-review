// Choosing the browser's Mandarin voice. Voice lists differ per OS and browser, so voices are scored
// instead of taking the first zh-CN one (on macOS Chrome that is Eddy, a robotic Eloquence voice).

const CHINESE = /^zh/i;
const MAINLAND = /zh[-_](CN|Hans)/i;
const ELOQUENCE = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
const NEURAL = /natural|neural|online/i; // Edge's Xiaoxiao Online (Natural) and the like
const DEFAULT_LOCAL = /^Ting-?ting\b/i; // macOS's default Mandarin voice
const GOOD_LOCAL = /^(Li-Mu|Yu-shu|Lili|Lilian)\b/i; // Apple's other Mandarin voices

const isChinese = (v) => CHINESE.test(v.lang) || /chinese|中文|普通话/i.test(v.name);

function score(v) {
  if (ELOQUENCE.test(v.name)) return 0;
  let s = MAINLAND.test(v.lang) ? 10 : 1;
  if (NEURAL.test(v.name)) s += 5;
  else if (DEFAULT_LOCAL.test(v.name)) s += 4;
  else if (GOOD_LOCAL.test(v.name)) s += 3.5;
  else if (/google/i.test(v.name)) s += 3;
  return s;
}

// The best Chinese voice of `voices`, or null when there is none. Ties keep the browser's order.
export function pickVoice(voices) {
  let best = null;
  for (const v of voices) if (isChinese(v) && (!best || score(v) > score(best))) best = v;
  return best;
}
