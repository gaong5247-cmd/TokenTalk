CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author` text NOT NULL,
	`parent_id` text,
	`body` text NOT NULL,
	`language` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_post_created` ON `comments` (`post_id`,`created`);--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`channel` text NOT NULL,
	`body` text NOT NULL,
	`language` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_channel_created` ON `messages` (`channel`,`created`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`language` text NOT NULL,
	`kind` text DEFAULT 'post' NOT NULL,
	`extra` text DEFAULT '{}' NOT NULL,
	`fork_of` text,
	`created` integer NOT NULL,
	`activity` integer NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`sample` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `posts_category_created` ON `posts` (`category`,`created`);--> statement-breakpoint
CREATE INDEX `posts_kind_created` ON `posts` (`kind`,`created`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`language` text DEFAULT 'ko' NOT NULL,
	`auto_translate` integer DEFAULT 1 NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `views` (
	`post_id` text NOT NULL,
	`viewer` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`post_id`, `viewer`, `day`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`value` integer NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
