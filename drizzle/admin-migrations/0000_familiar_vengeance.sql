CREATE TABLE `admin` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` int NOT NULL DEFAULT 0,
	`image` text,
	`role` varchar(20) NOT NULL,
	`department` varchar(255),
	`permissions` json DEFAULT ('[]'),
	`status` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `admin_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `admin_account` (
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
	CONSTRAINT `admin_account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_login_log` (
	`id` varchar(255) NOT NULL,
	`admin_id` varchar(255) NOT NULL,
	`login_at` timestamp NOT NULL,
	`login_ip` varchar(45),
	`user_agent` text,
	`status` varchar(20) NOT NULL,
	`failure_reason` text,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `admin_login_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_session` (
	`id` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`ip_address` varchar(255),
	`user_agent` text,
	`user_id` varchar(255) NOT NULL,
	CONSTRAINT `admin_session_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `admin_verification` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `admin_verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon` (
	`id` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(20) NOT NULL,
	`value` int NOT NULL,
	`min_order_amount` int NOT NULL DEFAULT 0,
	`max_discount_amount` int,
	`usage_limit` int NOT NULL DEFAULT 0,
	`usage_count` int NOT NULL DEFAULT 0,
	`per_user_limit` int NOT NULL DEFAULT 1,
	`subscribe_ids` json DEFAULT ('[]'),
	`start_at` timestamp,
	`end_at` timestamp,
	`status` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `coupon_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `creation` (
	`id` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`model` varchar(255) NOT NULL,
	`type` varchar(20) NOT NULL,
	`prompt` text NOT NULL,
	`aspect_ratio` varchar(10) NOT NULL DEFAULT '1:1',
	`image_count` int NOT NULL DEFAULT 1,
	`status` varchar(20) NOT NULL,
	`result_urls` text,
	`error_message` text,
	`deleted` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `creation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscribe` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(20) NOT NULL,
	`price` int NOT NULL,
	`original_price` int,
	`credits` int NOT NULL DEFAULT 0,
	`duration` int NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_popular` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`deleted_at` timestamp,
	CONSTRAINT `subscribe_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscribe_model` (
	`id` varchar(255) NOT NULL,
	`subscribe_id` varchar(255) NOT NULL,
	`model_id` varchar(255) NOT NULL,
	`max_usage` int NOT NULL DEFAULT 0,
	`enabled` int NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `subscribe_model_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribe_model_subscribe_id_model_id_unique` UNIQUE(`subscribe_id`,`model_id`)
);
--> statement-breakpoint
CREATE TABLE `user_coupon` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`coupon_id` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL,
	`used_at` timestamp,
	`order_id` varchar(255),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `user_coupon_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`model_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '',
	`type` varchar(20) NOT NULL,
	`description` text,
	`settings` text,
	`enabled` int NOT NULL DEFAULT 1,
	`ability` enum('t2i','i2i','t2v') NOT NULL,
	`supported_aspect_ratios` varchar(255),
	`sort` int NOT NULL DEFAULT 0,
	`max_input_images` int,
	`video_durations` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_models_provider_id_model_id_unique` UNIQUE(`provider_id`,`model_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`endpoints` varchar(255),
	`secret_key` varchar(255),
	`enabled` int NOT NULL DEFAULT 1,
	`settings` text,
	`sort` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `ai_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_providers_provider_id_unique` UNIQUE(`provider_id`)
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`subscribe_id` varchar(255) NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`type` varchar(20) NOT NULL,
	`total_amount` int NOT NULL,
	`discount_amount` int NOT NULL DEFAULT 0,
	`actual_amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`coupon_id` varchar(255),
	`status` varchar(20) NOT NULL,
	`remark` text,
	`expires_at` timestamp,
	`cancelled_at` timestamp,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`deleted_at` timestamp,
	CONSTRAINT `order_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_order_no_unique` UNIQUE(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`transaction_id` varchar(255),
	`channel` varchar(20) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`status` varchar(20) NOT NULL,
	`client_ip` varchar(64),
	`user_agent` text,
	`payment_data` text,
	`error_code` varchar(50),
	`error_message` text,
	`remark` text,
	`processed_at` timestamp,
	`failed_at` timestamp,
	`refunded_at` timestamp,
	`refund_amount` int,
	`refund_transaction_id` varchar(255),
	`refund_reason` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `payment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_account` ADD CONSTRAINT `admin_account_user_id_admin_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_login_log` ADD CONSTRAINT `admin_login_log_admin_id_admin_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_session` ADD CONSTRAINT `admin_session_user_id_admin_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscribe_model` ADD CONSTRAINT `subscribe_model_subscribe_id_subscribe_id_fk` FOREIGN KEY (`subscribe_id`) REFERENCES `subscribe`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscribe_model` ADD CONSTRAINT `subscribe_model_model_id_ai_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_coupon` ADD CONSTRAINT `user_coupon_coupon_id_coupon_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupon`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_subscribe_id_subscribe_id_fk` FOREIGN KEY (`subscribe_id`) REFERENCES `subscribe`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_coupon_id` ON `order` (`coupon_id`);