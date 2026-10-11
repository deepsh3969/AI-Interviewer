import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser speech synthesis for reading questions aloud.
 * Supported in all modern browsers; voice availability depends on the OS.
 */

export interface SpeakOptions {
  rate?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

export function useSpeechSynthesis() {
  const supported = speechSynthesisSupported();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
      utterance.lang = options.lang ?? 'en-US';
      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
        setError(null);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
        options.onEnd?.();
      };
      utterance.onerror = (event) => {
        setSpeaking(false);
        setPaused(false);
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          const message = `Text-to-speech failed (${event.error}).`;
          setError(message);
          options.onError?.(message);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const pause = useCallback(() => {
    if (!supported || !speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported, speaking]);

  const resume = useCallback(() => {
    if (!supported || !paused) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported, paused]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, speaking, paused, error, speak, stop, pause, resume };
}
