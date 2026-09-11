import { getCloudflareContext } from "@opennextjs/cloudflare";

export type StructuredStep = { order: number; text: string };
export type StructuredReagent = {
  name: string;
  amount: string;
  concentration: string;
  reagentId: string | null; // null = not matched to anything in inventory
};
// Made during the session, not drawn from stock — kept out of `reagents` so
// the admin's "what should we stock" view only shows purchasable items.
export type StructuredPreparation = { name: string; detail: string };

export type KnownReagent = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  aliases: string | null;
};

// Chosen by measured bake-off against llama-3.1-8b-fp8 (the previous model),
// llama-3.3-70b-fp8-fast and mistral-small-3.1-24b, 3 trials each on a
// 14-step/6-reagent transcript. Scout was the only combination that got every
// step, every reagent AND every inventory name exactly right, at ~5.3s median
// vs ~17s for llama-3.1-8b.
//
// Deliberately paired with json_object, NOT json_schema, even though this
// model supports json_schema: under schema-constrained decoding it regressed,
// emitting a duplicate reagent row (one with an empty amount) and drifting
// from imperative to past-tense steps. Schema enforcement is worth less here
// than correct content, since isParsedLlmOutput already rejects bad shapes.
const LLM_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

function buildSystemPrompt(knownReagents: KnownReagent[]): string {
  // Stock is included so the model sees what is actually on hand, and aliases
  // so a dictated synonym ("sodium chloride") can be recognised as the stocked
  // item ("NaCl").
  const inventoryList =
    knownReagents.length > 0
      ? knownReagents
          .map((r) => {
            const aliases = (r.aliases ?? "")
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean);
            const alsoCalled =
              aliases.length > 0 ? ` (also called: ${aliases.join(", ")})` : "";
            return `- ${r.name} — ${r.stock} ${r.unit} in stock${alsoCalled}`;
          })
          .join("\n")
      : "(inventory is currently empty)";

  // Kept deliberately short. A long, heavily-caveated prompt measurably hurt
  // this model's output; the rules that actually matter are enforced in code
  // (isParsedLlmOutput for shape, matchReagentId for inventory linking). Two
  // lines are non-negotiable even in a short prompt, though:
  //  - the role framing, so the model reads short dictated fragments as bench
  //    procedure rather than as a bare instruction to itself;
  //  - "every" + "only what was said", because without it a model can quietly
  //    drop something in a long dictation or fill a gap with something
  //    plausible-sounding that was never actually spoken.
  return `You are a lab notebook assistant. A lab scientist is dictating at the bench while running an experiment. Structure their dictation into a notebook entry. Here is the avaiable stock of the reagents in the lab

INVENTORY:
${inventoryList}

Return ONLY this JSON, no other text:
{"steps": ["string", ...], "reagents": [{"name": "string", "amount": "string", "concentration": "string", "inInventory": true|false}, ...]}

- "steps": EVERY action performed, in order — do not skip or merge any. Keep the amounts, times, temperatures and instrument settings that were said. Skip recording chatter like "starting recording".
- "reagents": EVERY reagent used, however briefly mentioned — do not skip any though they do not match with available inventory.
- "amount": how much was used — a number and unit ONLY, e.g. "50 mL", "5 g". Use "" if not stated. Never put a concentration here.
- "concentration": the strength if stated, e.g. "50 mM", "pH 7.5", "70%". Use "" if not stated.
- "inInventory": true if the reagent is in the INVENTORY list above, otherwise false.
- Use ONLY what the scientist said. Do not add, infer, or complete anything they didn't state.`;
}

// Workers AI uses two different response envelopes depending on the model:
// the llama-3.1 family returns the text in `response`, while the newer models
// (llama-3.3/4, mistral-small, qwen3) return an OpenAI-style
// `choices[0].message.content` — and some return BOTH keys with only one
// populated. Reading only `response`, as this code used to, silently yields
// an empty string on the newer models and sends every entry to the naive
// regex fallback. Handle both.
function extractResponseText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
  };
  if (typeof r.response === "string" && r.response.trim()) return r.response;
  const content = r.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  return "";
}

// The model sometimes wraps the JSON in ```json fences or adds a stray
// sentence before/after it despite being told not to — pull out the
// outermost {...} rather than requiring the whole response to be clean JSON.
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}

type ParsedLlmReagent = {
  name: string;
  amount: string;
  concentration: string;
  inInventory: boolean;
};
type ParsedLlmPreparation = { name: string; detail: string };
type ParsedLlmOutput = {
  steps: string[];
  reagents: ParsedLlmReagent[];
  preparations: ParsedLlmPreparation[];
};

// Tolerates a missing/omitted optional string rather than failing the whole
// response over it — `concentration` and `preparations` are frequently absent
// (a dictation may genuinely have neither), and rejecting the parse there
// would send an otherwise-perfect extraction to the naive regex fallback.
function optionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isParsedLlmOutput(value: unknown): value is ParsedLlmOutput {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  if (
    !Array.isArray(candidate.steps) ||
    !candidate.steps.every((step) => typeof step === "string")
  ) {
    return false;
  }

  if (!Array.isArray(candidate.reagents)) return false;
  const reagentsOk = candidate.reagents.every((reagent) => {
    if (typeof reagent !== "object" || reagent === null) return false;
    const r = reagent as Record<string, unknown>;
    return (
      typeof r.name === "string" &&
      optionalString(r.amount) &&
      optionalString(r.concentration)
    );
  });
  if (!reagentsOk) return false;

  if (candidate.preparations === undefined || candidate.preparations === null) {
    return true;
  }
  if (!Array.isArray(candidate.preparations)) return false;
  return candidate.preparations.every((prep) => {
    if (typeof prep !== "object" || prep === null) return false;
    const p = prep as Record<string, unknown>;
    return typeof p.name === "string" && optionalString(p.detail);
  });
}

// Punctuation and "percent"/"%" are the two things models vary on most when
// echoing an inventory name back ("Ethanol 70 percent" vs "Ethanol, 70%"), so
// both sides are reduced to a comparable core before matching.
function normalizeReagentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bpercent\b/g, "%")
    .replace(/[^a-z0-9%]+/g, " ")
    // "70 percent" becomes "70 %" above while "70%" stays "70%" — close the
    // gap so the two forms compare equal.
    .replace(/\s+%/g, "%")
    .trim()
    .replace(/\s+/g, " ");
}

// Resolves an extracted reagent name to an inventory id, matching
// normalized-exact against each item's name AND its admin-curated aliases.
//
// The model's own "inInventory" boolean is NOT used to decide this. It can't
// be: deducting stock needs to know WHICH row to deduct from, and a boolean
// doesn't identify a row. It's also been wrong in both directions —
// claiming "protein stock" was inventory (it meant "Pfizer"), and claiming a
// stocked synonym wasn't. So the boolean is treated as a hint we cross-check
// (see the disagreement warning below) while this function is the authority.
function inventoryNamesFor(reagent: KnownReagent): string[] {
  return [
    reagent.name,
    ...(reagent.aliases ?? "").split(",").map((a) => a.trim()),
  ].filter(Boolean);
}

function matchReagentId(
  name: string,
  concentration: string,
  knownReagents: KnownReagent[]
): string | null {
  // An inventory item's qualifier often lives in its name ("Ethanol, 70%")
  // while the model splits it out ("Ethanol" + "70%"), so the name combined
  // with its concentration is tried as well as the bare name. This can only
  // ever produce an exact match, so it does NOT resurrect the pH bug:
  // "Tris buffer" + "50 mM, pH 7.5" normalizes to "tris buffer 50 mM pH 7.5",
  // which correctly fails to equal "tris buffer pH 7.4".
  const candidates = [name, `${name} ${concentration}`];
  for (const candidate of candidates) {
    const target = normalizeReagentName(candidate);
    if (!target) continue;
    const match = knownReagents.find((r) =>
      inventoryNamesFor(r).some((n) => normalizeReagentName(n) === target)
    );
    if (match) return match.id;
  }
  return null;
}

// Base ceiling for a normal dictation. Measured empirically: a 20-reagent /
// 28-step dictation used 1083 completion tokens; this leaves real headroom
// above that before hitting TRUNCATION_RETRY_MAX_TOKENS below.
const BASE_MAX_TOKENS = 3072;
// Used only when the previous attempt was cut off mid-response — see
// isTruncated. Kept separate from, and much larger than, the base ceiling so
// a genuinely huge dictation gets one real shot at fitting instead of
// hitting the exact same wall twice. (That double-hit was reproduced with a
// synthetic 40-reagent/40-step dictation before this fix: completion_tokens
// landed at exactly 1536 — the old cap — on BOTH the first attempt and the
// identically-capped retry, so it silently fell back to the naive regex,
// which is a much cruder parse than the LLM path this whole feature exists
// for.)
const TRUNCATION_RETRY_MAX_TOKENS = 6144;

// True when the model's own finish reason says it was cut off for length,
// not because it chose to stop. This is a fact reported by the API, not a
// guess from string shape.
function isTruncated(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as { choices?: { finish_reason?: unknown }[] };
  return r.choices?.[0]?.finish_reason === "length";
}

async function attemptStructuring(
  env: ReturnType<typeof getCloudflareContext>["env"],
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<
  | { ok: true; parsed: ParsedLlmOutput }
  | { ok: false; reason: string; rawText?: string; truncated: boolean }
> {
  const result = await env.AI.run(LLM_MODEL, {
    messages,
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
    // Deterministic, not creative — this is a JSON extraction task, not
    // freeform generation, so temperature only adds failure variance.
    temperature: 0,
  });

  const truncated = isTruncated(result);
  const text = extractResponseText(result);
  if (!text) return { ok: false, reason: "no response text in AI result", truncated };

  const jsonSlice = extractJsonObject(text) ?? text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (parseError) {
    return {
      ok: false,
      reason: `response was not valid JSON${truncated ? " (truncated: hit max_tokens)" : ""}: ${String(parseError)}`,
      rawText: text,
      truncated,
    };
  }

  if (!isParsedLlmOutput(parsed)) {
    return {
      ok: false,
      reason: "response JSON had the wrong shape",
      rawText: text,
      truncated,
    };
  }

  return { ok: true, parsed };
}

async function structureWithLlm(
  rawTranscript: string,
  knownReagents: KnownReagent[]
): Promise<{
  steps: StructuredStep[];
  reagents: StructuredReagent[];
  preparations: StructuredPreparation[];
} | null> {
  try {
    const { env } = getCloudflareContext();
    const baseMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: buildSystemPrompt(knownReagents) },
      { role: "user", content: rawTranscript },
    ];

    let attempt = await attemptStructuring(env, baseMessages, BASE_MAX_TOKENS);

    // Give the model exactly one more shot. Two different repairs, because
    // truncation and "malformed but complete" need different fixes:
    //  - truncated: the content itself was fine, it just ran out of room —
    //    retry the SAME prompt with a much higher ceiling. Retrying with the
    //    same max_tokens here was a real bug: a large dictation hit the exact
    //    same cap on both attempts and produced identical truncated JSON
    //    twice, silently falling all the way back to the naive regex.
    //  - malformed (stray commentary, markdown fences, a shape mismatch):
    //    quote the broken output back and ask the model to fix it — more
    //    tokens wouldn't help here, the problem is form, not length.
    if (!attempt.ok) {
      console.error("[structureWithLlm] first attempt failed, retrying", {
        reason: attempt.reason,
        truncated: attempt.truncated,
      });
      if (attempt.truncated) {
        attempt = await attemptStructuring(env, baseMessages, TRUNCATION_RETRY_MAX_TOKENS);
      } else {
        const retryMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
          ...baseMessages,
          { role: "assistant", content: attempt.rawText ?? "" },
          {
            role: "user",
            content:
              "That response was invalid: " +
              attempt.reason +
              ". Respond again with ONLY the JSON object, no commentary, no markdown code fences.",
          },
        ];
        attempt = await attemptStructuring(env, retryMessages, BASE_MAX_TOKENS);
      }
    }

    if (!attempt.ok) {
      console.error("[structureWithLlm] retry also failed, falling back to naive parsing", {
        reason: attempt.reason,
      });
      return null;
    }

    const parsed = attempt.parsed;
    return {
      steps: parsed.steps.map((text, i) => ({ order: i + 1, text })),
      reagents: parsed.reagents.map((r) => {
        const reagentId = matchReagentId(r.name, r.concentration ?? "", knownReagents);
        // Surfaces prompt/model drift: if the model keeps claiming a reagent
        // is stocked when no inventory name or alias matches, the fix is
        // usually a missing alias, not a code change.
        if (typeof r.inInventory === "boolean" && r.inInventory !== (reagentId !== null)) {
          console.warn("[structureWithLlm] inInventory disagreed with inventory match", {
            name: r.name,
            modelSaid: r.inInventory,
            matched: reagentId !== null,
          });
        }
        return {
          name: r.name,
          amount: r.amount ?? "",
          concentration: r.concentration ?? "",
          reagentId,
        };
      }),
      // The simplified prompt no longer asks the model to separate bench-made
      // working solutions, so this stays empty. The column, relation and UI
      // section are still in place, so re-enabling it is a prompt change only.
      preparations: [],
    };
  } catch (error) {
    console.error("[structureWithLlm] AI call failed", error);
    return null;
  }
}

// Naive fallback — comma/period splitting for steps, a regex for "<amount>
// of <reagent>" — used only if the LLM call fails or returns something we
// can't trust (network error, malformed JSON, wrong shape). Expect it to get
// clause boundaries wrong sometimes (e.g. "pH 7.4" as its own step).
const REAGENT_PATTERN =
  /(\d+(?:\.\d+)?\s?(?:m?L|m?g|kg|m?M|µL|uL|units?))\s+(?:of\s+)?([A-Za-z][\w %.-]*?)(?=,|\.|$|\s+(?:to|into|onto|in)\b)/gi;

function structureTranscriptNaive(
  rawTranscript: string,
  knownReagents: KnownReagent[]
): {
  steps: StructuredStep[];
  reagents: StructuredReagent[];
  preparations: StructuredPreparation[];
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
    reagents.push({
      name,
      amount,
      concentration: "",
      reagentId: matchReagentId(name, "", knownReagents),
    });
  }

  // A regex can't tell a stock reagent from something mixed up at the bench,
  // so this fallback never claims any preparations rather than guessing.
  return { steps, reagents, preparations: [] };
}

export async function structureTranscript(
  rawTranscript: string,
  knownReagents: KnownReagent[]
): Promise<{
  steps: StructuredStep[];
  reagents: StructuredReagent[];
  preparations: StructuredPreparation[];
}> {
  const llmResult = await structureWithLlm(rawTranscript, knownReagents);
  return llmResult ?? structureTranscriptNaive(rawTranscript, knownReagents);
}
