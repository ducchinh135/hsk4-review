import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_KEY = 'hsk4_autoSpeak';
const TTS = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;

// Web Speech API wrapper: picks a Mandarin voice, tracks which button is speaking.
export function useSpeech() {
  const voice = useRef(null);
  const [hasVoice, setHasVoice] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);
  const [auto, setAuto] = useState(() => {
    try {
      return localStorage.getItem(AUTO_KEY) === '1';
    } catch {
      return false;
    }
  });
  const autoRef = useRef(auto);
  autoRef.current = auto;

  useEffect(() => {
    if (!TTS) return undefined;
    const pick = () => {
      const vs = TTS.getVoices();
      if (!vs.length) return;
      const zh = vs.filter((v) => /^zh/i.test(v.lang) || /chinese|中文|普通话/i.test(v.name));
      voice.current = zh.find((v) => /zh[-_]CN/i.test(v.lang)) || zh[0] || null;
      setHasVoice(!!voice.current);
    };
    pick();
    TTS.addEventListener?.('voiceschanged', pick);
    const stop = () => TTS.cancel();
    window.addEventListener('pagehide', stop);
    return () => {
      TTS.removeEventListener?.('voiceschanged', pick);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  const cancel = useCallback(() => {
    if (!TTS) return;
    TTS.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((text, id) => {
    if (!TTS || !text) return;
    TTS.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (voice.current) u.voice = voice.current;
    u.rate = 0.85;
    setSpeakingId(id || null);
    if (id) u.onend = u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    TTS.speak(u);
  }, []);

  // Read the new word after navigating, only when the user enabled auto-read.
  const autoSpeak = useCallback((text) => {
    if (autoRef.current) speak(text);
  }, [speak]);

  const setAutoSpeak = useCallback(
    (on) => {
      setAuto(on);
      try {
        localStorage.setItem(AUTO_KEY, on ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (on) speak(' '); // unlock audio on iOS, must happen inside the click
      else cancel();
    },
    [speak, cancel]
  );

  return { supported: !!TTS, hasVoice, speakingId, auto, setAutoSpeak, speak, autoSpeak, cancel };
}
