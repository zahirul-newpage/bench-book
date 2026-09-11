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

export function NotebookEntryForm() {
  const [state, formAction] = useActionState(
    createNotebookEntry,
    initialState
  );
  const [rawTranscript, setRawTranscript] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="benchId" className="text-sm font-medium">
          Bench ID
        </label>
        <input
          id="benchId"
          name="benchId"
          type="text"
          required
          placeholder="Bench 3"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {state.errors?.benchId?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
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

      <div>
        <SubmitButton pendingChildren="Saving…">Save entry</SubmitButton>
      </div>
    </form>
  );
}
