import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser speech recognition (Web Speech API).
 *
 * Compatibility: Chromium-based browsers support window.SpeechRecognition /
 * webkitSpeechRecognition. Firefox and Safari generally do not - the hook
 * reports `supported: false` and the UI offers typed answers instead.
 * In Chrome recognition audio is processed by the browser vendor over the
 * network; this is disclosed in the UI and docs.
 */

export type RecognitionStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'stopped'
  | 'denied'
  | 'error';

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow the microphone in your browser settings, or type your answer.',
  'service-not-allowed': 'Speech recognition is blocked by the browser. Type your answer instead.',
  'audio-capture': 'No microphone was found. Check your input device or type your answer.',
  'no-speech': 'No speech was detected. Try again and speak closer to the microphone.',
  network: 'Speech recognition lost its network connection. Check your connection or type your answer.',
  aborted: 'Speech recognition was stopped.',
};

export interface UseSpeechRecognitionOptions {
  lang?: string;
  /** Called with the accumulated final transcript of this session. */
  onFinal?: (text: string) => void;
  /** Called on every interim hypothesis. */
  onInterim?: (text: string) => void;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  status: RecognitionStatus;
  interim: string;
  finalText: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const { lang = 'en-US', onFinal, onInterim } = options;
  const supported = speechRecognitionSupported();
  const [status, setStatus] = useState<RecognitionStatus>(supported ? 'idle' : 'unsupported');
  const [interim, setInterim] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalsRef = useRef<string[]>([]);
  const optionsRef = useRef({ onFinal, onInterim, lang });
  optionsRef.current = { onFinal, onInterim, lang };

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* instance already stopped */
    }
    recognitionRef.current = null;
    setInterim('');
    setStatus((current) => (current === 'listening' || current === 'requesting' ? 'stopped' : current));
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.lang = optionsRef.current.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    finalsRef.current = [];
    setError(null);
    setInterim('');
    setStatus('requesting');

    recognition.onresult = (event) => {
      const interims: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalsRef.current.push(transcript.trim());
        } else {
          interims.push(transcript);
        }
      }
      const interimText = interims.join(' ').trim();
      setInterim(interimText);
      optionsRef.current.onInterim?.(interimText);
      const final = finalsRef.current.filter(Boolean).join(' ').trim();
      if (final) {
        setFinalText(final);
        optionsRef.current.onFinal?.(final);
      }
    };

    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error] ?? `Speech recognition failed (${event.error}).`;
      setError(message);
      setStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'denied' : 'error');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim('');
      setStatus((current) => (current === 'error' || current === 'denied' ? current : 'stopped'));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus('error');
      setError('Speech recognition could not start. It may already be running - try again.');
    }
  }, [supported]);

  const reset = useCallback(() => {
    finalsRef.current = [];
    setFinalText('');
    setInterim('');
    setError(null);
    setStatus(supported ? 'idle' : 'unsupported');
  }, [supported]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  return { supported, status, interim, finalText, error, start, stop, reset };
}
