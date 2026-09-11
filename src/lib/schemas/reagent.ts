import { z } from "zod";

const stockSchema = z.coerce
  .number("Stock must be a number")
  .min(0, "Stock cannot be negative")
  .max(1_000_000, "Stock must be 1,000,000 or fewer");

export const newReagentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(20, "Unit must be 20 characters or fewer"),
  // Optional comma-separated synonyms an admin confirms mean the same stock
  // item, e.g. "sodium chloride, table salt" for NaCl. Used to match
  // dictated reagent names; see db/schema.ts for why these are curated.
  aliases: z
    .string()
    .trim()
    .max(200, "Aliases must be 200 characters or fewer")
    .optional(),
  stock: stockSchema,
});

// Aliases here reuses newReagentSchema's field so both forms agree on limits.
export const reagentUpdateSchema = z.object({
  reagentId: z.string().trim().min(1, "Reagent is required"),
  stock: stockSchema,
  aliases: z
    .string()
    .trim()
    .max(200, "Aliases must be 200 characters or fewer")
    .optional(),
});

export type NewReagentInput = z.infer<typeof newReagentSchema>;
export type ReagentUpdateInput = z.infer<typeof reagentUpdateSchema>;
