import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "scientist"] }).notNull(),
});

export const reagents = sqliteTable("reagents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  stock: real("stock").notNull(),
  // Comma-separated alternative names an admin has confirmed refer to this
  // same stock item ("sodium chloride, table salt" for NaCl). Dictation
  // matching is done against name + aliases by exact comparison.
  //
  // This exists because the alternative was asking the LLM which inventory
  // item a mention maps to, and it hallucinated: it mapped "protein stock"
  // onto "Pfizer", which the code then accepted because "Pfizer" was a real
  // inventory name. A synonym ("sodium chloride" -> "NaCl") and a
  // hallucination ("protein stock" -> "Pfizer") share zero tokens, so no
  // string heuristic can tell them apart — only a human can. Hence aliases
  // are admin-curated data, never model-inferred.
  aliases: text("aliases"),
});

export const notebookEntries = sqliteTable("notebook_entries", {
  id: text("id").primaryKey(),
  benchId: text("bench_id").notNull(),
  rawTranscript: text("raw_transcript").notNull(),
  authorId: text("author_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const entrySteps = sqliteTable("entry_steps", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => notebookEntries.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  text: text("text").notNull(),
});

export const entryReagents = sqliteTable("entry_reagents", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => notebookEntries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Quantity consumed with its unit only ("50 mL", "5 g") — deliberately
  // kept free of concentration/pH so it can eventually drive inventory
  // deduction against reagents.stock, which is a plain number + unit.
  amount: text("amount").notNull(),
  // Stated strength, kept separate from amount ("50 mM", "70%", "pH 7.5").
  concentration: text("concentration"),
  // Null when this mention couldn't be tied to an existing inventory item —
  // the UI labels these "not in inventory" so an admin knows what to add.
  // Set on write, never inferred at read time.
  reagentId: text("reagent_id").references(() => reagents.id),
});

// Working solutions, mixes and dilution series MADE during a session (assay
// buffer, a 2x enzyme stock, a serial dilution series). Recorded for
// reproducibility but deliberately NOT reagents: they aren't purchasable, so
// listing them alongside stock items polluted the admin's "what should we
// stock" view with entries like "Enzyme stock".
export const entryPreparations = sqliteTable("entry_preparations", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => notebookEntries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  detail: text("detail").notNull(),
});

// One row per stock-deduction TASK, one per dictated reagent that matched
// inventory — created "queued" the moment createEntry enqueues it, and
// updated in place as the queue consumer works through it (see
// src/lib/queue/stock-deduction-consumer.ts). This is what makes queue
// activity visible on /admin as a live lifecycle, not only in
// `wrangler tail`/the observability API.
//
// The row's id is the SAME id carried in the queue message body — the
// producer (entries.ts) and consumer update the same row rather than the
// consumer inserting a fresh one, which is what makes "queued"/"in_progress"
// observable at all (a row that only appeared once processing finished
// could never show an in-flight state).
//
// Deliberately NOT foreign-keyed to notebook_entries or reagents: it's a
// durable history log, and must still show what happened even after the
// entry is deleted (scientists can delete their own entries) or,
// hypothetically, a reagent is removed. reagentName is denormalized for the
// same reason — readable without a join that could go missing.
export const stockDeductionLog = sqliteTable("stock_deduction_log", {
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull(),
  reagentId: text("reagent_id").notNull(),
  reagentName: text("reagent_name").notNull(),
  amount: real("amount").notNull(),
  status: text("status", {
    enum: ["queued", "in_progress", "success", "failed"],
  }).notNull(),
  // Set on the failing attempt; left in place across a retry back to
  // "queued" so an admin can see why the last attempt failed even while
  // it's still pending redelivery, not just once it's terminally "failed".
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notebookEntriesRelations = relations(
  notebookEntries,
  ({ many, one }) => ({
    steps: many(entrySteps),
    reagents: many(entryReagents),
    preparations: many(entryPreparations),
    author: one(users, {
      fields: [notebookEntries.authorId],
      references: [users.id],
    }),
  })
);

export const entryPreparationsRelations = relations(
  entryPreparations,
  ({ one }) => ({
    entry: one(notebookEntries, {
      fields: [entryPreparations.entryId],
      references: [notebookEntries.id],
    }),
  })
);

export const entryStepsRelations = relations(entrySteps, ({ one }) => ({
  entry: one(notebookEntries, {
    fields: [entrySteps.entryId],
    references: [notebookEntries.id],
  }),
}));

export const entryReagentsRelations = relations(entryReagents, ({ one }) => ({
  entry: one(notebookEntries, {
    fields: [entryReagents.entryId],
    references: [notebookEntries.id],
  }),
  reagent: one(reagents, {
    fields: [entryReagents.reagentId],
    references: [reagents.id],
  }),
}));
