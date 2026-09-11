"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// What actually happens, in this order, once the form submits (see
// createEntry): the raw transcript is saved, an LLM structures it and
// matches reagents against inventory, the entry/steps/reagents write to D1,
// then stock-deduction messages get queued. These messages advance on a
// timer, not real server events — there's no cheap way to stream progress
// out of a single Server Action — but the order and rough pacing are real,
// not just decorative. The whole thing usually takes a few seconds; a large
// dictation can take longer since a bigger response needs more from the
// LLM (see structuring.ts's retry/truncation handling), which is exactly
// when a static "Saving…" starts to feel stuck.
const STAGES = [
  "Saving your dictation…",
  "Structuring it with AI…",
  "Matching reagents to inventory…",
  "Writing the entry…",
  "Almost done…",
];
const STAGE_INTERVAL_MS = 2500;

// Only rendered while `pending` — see SavingProgress below — so it mounts
// fresh, with a fresh `useState(0)`, every time a save starts. That's what
// resets the stage on each new submission, with no manual reset logic (no
// ref, no setState-in-effect) needed.
function StageTicker() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
    >
      <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
      {STAGES[stageIndex]}
    </p>
  );
}

export function SavingProgress() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return <StageTicker />;
}
