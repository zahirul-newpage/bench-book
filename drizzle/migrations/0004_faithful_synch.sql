CREATE TABLE `stock_deduction_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`reagent_id` text NOT NULL,
	`reagent_name` text NOT NULL,
	`amount` real NOT NULL,
	`outcome` text NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL
);
