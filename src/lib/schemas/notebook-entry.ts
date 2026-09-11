import { z } from "zod";

export const RAW_TRANSCRIPT_MIN_LENGTH = 10;
export const RAW_TRANSCRIPT_MAX_LENGTH = 4000;
export const BENCH_ID_MAX_LENGTH = 40;

export const notebookEntrySchema = z.object({
  benchId: z
    .string()
    .trim()
    .min(1, "Bench ID is required")
    .max(BENCH_ID_MAX_LENGTH, `Bench ID must be ${BENCH_ID_MAX_LENGTH} characters or fewer`),
  rawTranscript: z
    .string()
    .trim()
    .min(RAW_TRANSCRIPT_MIN_LENGTH, `Entry must be at least ${RAW_TRANSCRIPT_MIN_LENGTH} characters`)
    .max(RAW_TRANSCRIPT_MAX_LENGTH, `Entry must be ${RAW_TRANSCRIPT_MAX_LENGTH} characters or fewer`),
});

export type NotebookEntryInput = z.infer<typeof notebookEntrySchema>;
