CREATE TABLE `account` (
	`id` varchar(255) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`password` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`ip_address` varchar(255),
	`user_agent` text,
	`user_id` varchar(255) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` int NOT NULL DEFAULT 0,
	`image` text,
	`role` varchar(10) NOT NULL,
	`invite_code` varchar(255),
	`parent_user_id` varchar(255),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_invite_code_unique` UNIQUE(`invite_code`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`theme` varchar(10) DEFAULT 'system',
	`theme_color` varchar(10) DEFAULT 'default',
	`language` varchar(10) DEFAULT 'system',
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`deleted` int DEFAULT 0,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` varchar(255) NOT NULL,
	`message_id` varchar(255) NOT NULL,
	`file_id` varchar(255) NOT NULL,
	`type` varchar(10) NOT NULL DEFAULT 'image',
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_generations` (
	`id` varchar(255) NOT NULL,
	`type` varchar(10) NOT NULL DEFAULT 'image',
	`user_id` varchar(255) NOT NULL,
	`prompt` text NOT NULL,
	`parameters` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` varchar(20) DEFAULT 'pending',
	`file_ids` text,
	`error_reason` varchar(30),
	`generation_time` int,
	`token_count` int,
	`cost` double,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `message_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`chat_id` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`role` varchar(20) NOT NULL,
	`type` varchar(10) NOT NULL DEFAULT 'text',
	`generation_id` varchar(255),
	`metadata` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`model_id` varchar(255) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`user_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_models_user_id_provider_id_model_id_unique` UNIQUE(`user_id`,`provider_id`,`model_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`settings` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `ai_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_providers_provider_id_unique` UNIQUE(`provider_id`),
	CONSTRAINT `ai_providers_user_id_provider_id_unique` UNIQUE(`user_id`,`provider_id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`storage` varchar(10) NOT NULL,
	`url` text NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_chats_id_fk` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_generation_id_message_generations_id_fk` FOREIGN KEY (`generation_id`) REFERENCES `message_generations`(`id`) ON DELETE set null ON UPDATE no action;