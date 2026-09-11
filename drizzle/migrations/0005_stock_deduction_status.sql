-- stock_deduction_log's `outcome` (success | failure, written once at the
-- end) becomes `status` (queued | in_progress | success | failed, updated in
-- place as the queue consumer works through each task) plus `updated_at`.
-- Table was empty in both environments at the time of this migration
-- (verified via `select count(*)`), so a drop + recreate is used rather than
-- a data-preserving column rename.
DROP TABLE `stock_deduction_log`;
--> statement-breakpoint
CREATE TABLE `stock_deduction_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`reagent_id` text NOT NULL,
	`reagent_name` text NOT NULL,
	`amount` real NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
