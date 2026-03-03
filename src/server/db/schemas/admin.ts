import { mysqlTable, varchar, timestamp, text, int, json } from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const adminStatus = ["active", "inactive", "suspended"] as const;
export type AdminStatus = (typeof adminStatus)[number];

export const admin = mysqlTable("admin", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	department: varchar("department", { length: 255 }),
	permissions: json("permissions").$type<string[]>().default([]),
	lastLoginAt: timestamp("last_login_at"),
	lastLoginIp: varchar("last_login_ip", { length: 45 }),
	status: varchar("status", { length: 20, enum: adminStatus })
		.$defaultFn(() => "active")
		.notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

export const adminLoginLog = mysqlTable("admin_login_log", {
	id: varchar("id", { length: 255 }).primaryKey(),
	adminId: varchar("admin_id", { length: 255 })
		.notNull()
		.references(() => admin.id, { onDelete: "cascade" }),
	loginAt: timestamp("login_at").notNull(),
	loginIp: varchar("login_ip", { length: 45 }),
	userAgent: text("user_agent"),
	status: varchar("status", { length: 20 }).notNull(),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
});
