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
	`admin_id` varchar(255) NOT NULL,
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
	`admin_id` varchar(255) NOT NULL,
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
ALTER TABLE `admin_account` ADD CONSTRAINT `admin_account_admin_id_admin_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_login_log` ADD CONSTRAINT `admin_login_log_admin_id_admin_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_session` ADD CONSTRAINT `admin_session_admin_id_admin_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;