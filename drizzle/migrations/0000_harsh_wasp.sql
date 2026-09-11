CREATE TABLE `entry_reagents` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `notebook_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `notebook_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`bench_id` text NOT NULL,
	`raw_transcript` text NOT NULL,
	`author_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reagents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`stock` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);