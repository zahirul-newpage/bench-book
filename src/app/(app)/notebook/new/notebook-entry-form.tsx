"use client";

import { useState } from "react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  createNotebookEntry,
  type NotebookEntryFormState,
} from "./actions";
import { RAW_TRANSCRIPT_MAX_LENGTH } from "@/lib/schemas/notebook-entry";
import { VoiceRecorder } from "./voice-recorder";
import { SavingProgress } from "./saving-progress";

const initialState: NotebookEntryFormState = {};

// Lifted up so both the textarea (controlled) and this counter can read the
// same value — the counter itself owns no state of its own.
function CharacterCount({ value }: { value: string }) {
  const remaining = RAW_TRANSCRIPT_MAX_LENGTH - value.length;
  const overLimit = remaining < 0;

  return (
    <p
      className={`text-xs ${
        overLimit
          ? "text-red-600 dark:text-red-400"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {overLimit
        ? `${Math.abs(remaining)} characters over the limit`
        : `${remaining} characters left`}
    </p>
  );
}

export function NotebookEntryForm({
  defaultBenchId,
}: {
  defaultBenchId: string;
}) {
  const [state, formAction] = useActionState(
    createNotebookEntry,
    initialState
  );
  const [rawTranscript, setRawTranscript] = useState("");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/*
        Bench ID is metadata about the entry, not the entry itself — kept
        visually quieter (smaller label, no border-emphasis) than the
        dictation section below, which is what this whole page is actually
        for. Before this, both fields carried equal visual weight despite
        one being a one-time default most people never touch.
      */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="benchId"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Bench ID
          </label>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Auto-filled — edit if you&rsquo;d like to name it yourself
          </span>
        </div>
        <input
          id="benchId"
          name="benchId"
          type="text"
          required
          defaultValue={defaultBenchId}
          className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state.errors?.benchId?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-900" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label htmlFor="rawTranscript" className="text-sm font-medium">
            Dictated entry
          </label>
          <CharacterCount value={rawTranscript} />
        </div>
        <VoiceRecorder
          onTranscribed={(text) =>
            setRawTranscript((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
          }
        />
        <textarea
          id="rawTranscript"
          name="rawTranscript"
          rows={8}
          required
          minLength={10}
          value={rawTranscript}
          onChange={(e) => setRawTranscript(e.target.value)}
          placeholder="Adding 5 mL of Tris buffer, pH 7.4, incubating at 37°C for 20 minutes…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {state.errors?.rawTranscript?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {state.message && !state.errors && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <SubmitButton pendingChildren="Saving…">Save entry</SubmitButton>
        </div>
        <SavingProgress />
      </div>
    </form>
  );
}
