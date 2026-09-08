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
  amount: text("amount").notNull(),
});

export const notebookEntriesRelations = relations(
  notebookEntries,
  ({ many, one }) => ({
    steps: many(entrySteps),
    reagents: many(entryReagents),
    author: one(users, {
      fields: [notebookEntries.authorId],
      references: [users.id],
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
}));
