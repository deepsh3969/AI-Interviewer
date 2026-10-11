# Speech input & limits

## Two transcription paths

### 1. Browser Web Speech API (default, on-device intent)

- Uses `window.SpeechRecognition` / `webkitSpeechRecognition` when available (best in Chrome/Edge).
- Requires microphone permission; language comes from Preferences (`speechLang`).
- Interim results stream into the draft textarea; finalised text is appended. You can (and should) edit before submitting - nothing is sent to this app's servers.
- **Limits**: not available in Firefox/Safari in most versions; accuracy depends on the browser and OS; no guarantee of offline operation; the app cannot export raw audio because the browser API does not expose it.

### 2. Remote transcription (opt-in)

- Records a short clip in the browser (`MediaRecorder`) and POSTs base64 audio to `POST /api/transcribe`.
- The server forwards to the configured provider (Deepgram when `SPEECH_PROVIDER=deepgram` and `SPEECH_API_KEY` is set).
- **Consent**: only offered when the deployment reports a configured provider (`/api/status`) and the user has enabled "Allow remote transcription" in Settings. The room UI shows an explicit consent card before the first upload.
- **Limits**: no provider key ⇒ button is hidden and the UI says so; request body capped at 3 MB; 45 s / 60 s timeouts; audio is not stored by this app, but it does leave the browser.

## What this app never does

- Does not record in the background or auto-upload audio.
- Does not store raw audio or transcripts server-side.
- Does not claim perfect transcription - always review the draft before submitting.
