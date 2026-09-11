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
  stock: stockSchema,
});

export const reagentStockSchema = z.object({
  reagentId: z.string().trim().min(1, "Reagent is required"),
  stock: stockSchema,
});

export type NewReagentInput = z.infer<typeof newReagentSchema>;
export type ReagentStockInput = z.infer<typeof reagentStockSchema>;
