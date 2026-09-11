// Placeholder for the real AI structuring step (roadmap: Claude turns the raw
// transcript into steps + reagents). This is a naive heuristic — comma/period
// splitting for steps, a regex for "<amount> of <reagent>" — so entries have
// *something* structured to render until that's wired up. Expect it to get
// clause boundaries wrong sometimes (e.g. "pH 7.4" as its own step); that's
// exactly the gap the real AI step is meant to close.

export type StructuredStep = { order: number; text: string };
export type StructuredReagent = { name: string; amount: string };

const REAGENT_PATTERN =
  /(\d+(?:\.\d+)?\s?(?:m?L|m?g|kg|m?M|µL|uL|units?))\s+(?:of\s+)?([A-Za-z][\w %.-]*?)(?=,|\.|$|\s+(?:to|into|onto|in)\b)/gi;

export function structureTranscript(rawTranscript: string): {
  steps: StructuredStep[];
  reagents: StructuredReagent[];
} {
  const steps = rawTranscript
    .split(/[,.]\s*(?=[A-Za-z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, i) => ({ order: i + 1, text }));

  const reagents: StructuredReagent[] = [];
  const seen = new Set<string>();
  for (const match of rawTranscript.matchAll(REAGENT_PATTERN)) {
    const amount = match[1].trim();
    const name = match[2].trim().replace(/\s+/g, " ");
    const key = `${amount}|${name}`.toLowerCase();
    if (name.length < 2 || seen.has(key)) continue;
    seen.add(key);
    reagents.push({ name, amount });
  }

  return { steps, reagents };
}
