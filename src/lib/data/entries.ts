import type { NotebookEntryInput } from "@/lib/schemas/notebook-entry";
import {
  structureTranscript,
  type StructuredReagent,
  type StructuredStep,
} from "@/lib/structuring";

export type NotebookEntry = NotebookEntryInput & {
  id: string;
  createdAt: string;
  steps: StructuredStep[];
  reagents: StructuredReagent[];
};

const entries: NotebookEntry[] = [
  {
    id: "seed-1",
    benchId: "Bench 3",
    rawTranscript:
      "Added 5 mL of Tris buffer, pH 7.4, incubated at 37°C for 20 minutes, then centrifuged at 3000 RPM for 5 minutes.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    steps: [
      { order: 1, text: "Add Tris buffer, pH 7.4" },
      { order: 2, text: "Incubate at 37°C for 20 minutes" },
      { order: 3, text: "Centrifuge at 3000 RPM for 5 minutes" },
    ],
    reagents: [{ name: "Tris buffer, pH 7.4", amount: "5 mL" }],
  },
];

export async function listEntries(): Promise<NotebookEntry[]> {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEntryById(
  id: string
): Promise<NotebookEntry | null> {
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function createEntry(
  input: NotebookEntryInput
): Promise<NotebookEntry> {
  const { steps, reagents } = structureTranscript(input.rawTranscript);
  const entry: NotebookEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    steps,
    reagents,
  };
  entries.push(entry);
  return entry;
}
