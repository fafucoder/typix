CREATE TABLE `admin` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`department` varchar(255),
	`permissions` json DEFAULT ('[]'),
	`last_login_at` timestamp,
	`last_login_ip` varchar(45),
	`status` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `admin_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_user_id_unique` UNIQUE(`user_id`)
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
ALTER TABLE `admin` ADD CONSTRAINT `admin_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_login_log` ADD CONSTRAINT `admin_login_log_admin_id_admin_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE cascade ON UPDATE no action;