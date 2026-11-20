CREATE TABLE `responsibilities` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
