CREATE TABLE `expense_shares` (
	`expense_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	PRIMARY KEY(`expense_id`, `user_id`),
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`split_type` text NOT NULL,
	`paid_by` text NOT NULL,
	`spent_on` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_group_idx` ON `expenses` (`group_id`,`spent_on`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_invite_code_unique` ON `groups` (`invite_code`);--> statement-breakpoint
CREATE TABLE `members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`from_user` text NOT NULL,
	`to_user` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlements_group_idx` ON `settlements` (`group_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);