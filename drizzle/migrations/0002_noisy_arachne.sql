CREATE TABLE `entry_preparations` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`name` text NOT NULL,
	`detail` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `notebook_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `entry_reagents` ADD `concentration` text;