import { useCallback, useRef, useState } from 'react';

/**
 * Optional microphone recording for the remote transcription provider.
 *
 * Audio is captured locally with MediaRecorder and is only uploaded when the
 * user explicitly enables "remote transcription" (a provider must also be
 * configured server-side). Nothing is recorded or uploaded by default.
 */

export interface AudioRecorderState {
  supported: boolean;
  recording: boolean;
  error: string | null;
  elapsedSeconds: number;
  start: () => Promise<boolean>;
  stop: () => Promise<{ base64: string; mimeType: string } | null>;
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function useAudioRecorder(): AudioRecorderState {
  const supported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError('Audio recording is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mimeTypeRef.current = recorder.mimeType || mime || 'audio/webm';
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setError(null);
      setElapsedSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      return true;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow microphone access or type your answer.'
          : 'Could not access the microphone.';
      setError(message);
      setRecording(false);
      cleanup();
      return false;
    }
  }, [supported, cleanup]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanup();
      setRecording(false);
      return null;
    }
    const finished = await new Promise<{ blob: Blob }>((resolve) => {
      recorder.onstop = () => resolve({ blob: new Blob(chunksRef.current, { type: mimeTypeRef.current }) });
      recorder.stop();
    });
    recorderRef.current = null;
    cleanup();
    setRecording(false);
    if (finished.blob.size === 0) {
      setError('No audio was captured.');
      return null;
    }
    const base64 = await blobToBase64(finished.blob);
    return { base64, mimeType: mimeTypeRef.current };
  }, [cleanup]);

  return { supported, recording, error, elapsedSeconds, start, stop };
}
