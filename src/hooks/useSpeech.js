import { useCallback, useEffect, useRef, useState } from 'react';
import { pickVoice } from '../voice.js';

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
      voice.current = pickVoice(vs);
      setHasVoice(!!voice.current);
    };
    pick();
    TTS.addEventListener?.('voiceschanged', pick);
    const stop = () => {
      stopClip();
      TTS.cancel();
    };
    window.addEventListener('pagehide', stop);
    return () => {
      TTS.removeEventListener?.('voiceschanged', pick);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  const clip = useRef(null);
  const stopClip = () => {
    const a = clip.current;
    clip.current = null;
    if (a) {
      a.onended = a.onerror = null;
      a.pause();
    }
  };

  const cancel = useCallback(() => {
    stopClip();
    if (!TTS) return;
    TTS.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((text, id) => {
    stopClip();
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

  // Play a recorded mp3 (clearer than the browser's voice); read `text` aloud instead if it cannot load.
  const play = useCallback(
    (src, id, text) => {
      stopClip();
      TTS?.cancel();
      const a = new Audio(src);
      clip.current = a;
      setSpeakingId(id);
      const done = () => {
        if (clip.current !== a) return;
        clip.current = null;
        setSpeakingId((cur) => (cur === id ? null : cur));
      };
      a.onended = done;
      a.onerror = () => {
        if (clip.current !== a) return;
        done();
        speak(text, id);
      };
      a.play().catch((e) => e.name !== 'AbortError' && a.onerror?.());
    },
    [speak]
  );

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

  return { supported: !!TTS, hasVoice, speakingId, auto, setAutoSpeak, speak, play, autoSpeak, cancel };
}
