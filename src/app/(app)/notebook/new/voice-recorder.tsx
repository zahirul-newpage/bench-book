"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, FetchError } from "@/lib/fetch";

type TranscribeResponse = { text: string };
type Status = "idle" | "listening";

// Continuous "voice typing": one click starts a session that keeps listening
// until Stop. Whenever the mic goes quiet for SILENCE_MS after some speech,
// the segment captured so far is cut and sent to Whisper in the background
// while the NEXT segment starts recording immediately — so no audio is lost
// while the previous segment is in flight. MAX_SEGMENT_MS is a safety cap for
// someone who never pauses.
const SILENCE_MS = 1800;
const MAX_SEGMENT_MS = 25_000;
const MONITOR_INTERVAL_MS = 150;
const VOLUME_THRESHOLD = 0.02;
const MIN_SEGMENT_BYTES = 2_000;

function computeRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(buffer);
  let sumSquares = 0;
  for (const sample of buffer) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

// A real icon (not the 🎙 emoji, which renders inconsistently across
// platforms/fonts) — same stroke style as the rest of the app's icons
// (Logo, the notebook list's detail-view icon).
function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function VoiceRecorder({
  onTranscribed,
}: {
  onTranscribed: (text: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeRef = useRef(false);
  const hasSpeechRef = useRef(false);
  const lastLoudAtRef = useRef(0);
  const segmentStartedAtRef = useRef(0);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size < MIN_SEGMENT_BYTES) return;

      setPendingCount((count) => count + 1);
      try {
        const { text } = await fetchJson<TranscribeResponse>(
          "/api/transcribe",
          {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          }
        );
        if (text?.trim()) onTranscribed(text.trim());
      } catch (err) {
        const message =
          err instanceof FetchError &&
          typeof err.body === "object" &&
          err.body !== null &&
          "error" in err.body &&
          typeof (err.body as { error?: unknown }).error === "string"
            ? (err.body as { error: string }).error
            : "A segment failed to transcribe.";
        setError(message);
      } finally {
        setPendingCount((count) => count - 1);
      }
    },
    [onTranscribed]
  );

  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    hasSpeechRef.current = false;
    const now = Date.now();
    lastLoudAtRef.current = now;
    segmentStartedAtRef.current = now;

    // Local to this segment's closures — NOT a shared ref — so starting the
    // next segment (which happens before this one's async onstop fires)
    // can't clobber this segment's chunks.
    const segmentChunks: Blob[] = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) segmentChunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(segmentChunks, {
        type: recorder.mimeType || "audio/webm",
      });
      void transcribeBlob(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
  }, [transcribeBlob]);

  const flushSegment = useCallback(() => {
    const current = recorderRef.current;
    if (!current || current.state !== "recording") return;
    // Start the next segment first so the stream keeps being captured while
    // the just-finished segment transcribes in the background.
    startSegment();
    current.stop();
  }, [startSegment]);

  const checkVolume = useCallback(() => {
    if (!activeRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const buffer: Uint8Array<ArrayBuffer> = new Uint8Array(analyser.fftSize);
    const rms = computeRms(analyser, buffer);
    const now = Date.now();

    if (rms > VOLUME_THRESHOLD) {
      lastLoudAtRef.current = now;
      hasSpeechRef.current = true;
    }

    const silentFor = now - lastLoudAtRef.current;
    const segmentAge = now - segmentStartedAtRef.current;

    if (
      (hasSpeechRef.current && silentFor >= SILENCE_MS) ||
      segmentAge >= MAX_SEGMENT_MS
    ) {
      flushSegment();
    }
  }, [flushSegment]);

  const stopDictation = useCallback(() => {
    activeRef.current = false;
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
    monitorIntervalRef.current = null;

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;

    setStatus("idle");
  }, []);

  // Stop everything if the component unmounts mid-session (e.g. navigating away).
  useEffect(() => stopDictation, [stopDictation]);

  async function startDictation() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support microphone recording.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was denied or is unavailable.");
      return;
    }

    streamRef.current = stream;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    activeRef.current = true;
    startSegment();
    monitorIntervalRef.current = setInterval(checkVolume, MONITOR_INTERVAL_MS);
    setStatus("listening");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {status === "listening" ? (
        <button
          type="button"
          onClick={stopDictation}
          className="flex w-fit items-center gap-2.5 rounded-full border-2 border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
        >
          <span className="relative flex h-3 w-3 flex-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          {pendingCount > 0
            ? "Listening… (transcribing)"
            : "Listening… click to stop"}
        </button>
      ) : (
        <button
          type="button"
          onClick={startDictation}
          className="flex w-fit items-center gap-2.5 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-50 shadow-sm hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <MicIcon className="h-5 w-5" />
          Dictate
        </button>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
