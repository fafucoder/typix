import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";
import { user } from "./auth";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

const theme = ["system", "light", "dark"] as const;
export type Theme = (typeof theme)[number];

const themeColor = ["default", "red", "rose", "orange", "green", "blue", "yellow", "violet"] as const;
export type ThemeColor = (typeof themeColor)[number];

// User settings table - stores user UI and app settings
export const settings = mysqlTable("settings", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.unique(),
	theme: varchar("theme", { length: 10, enum: theme }).default("system"),
	themeColor: varchar("theme_color", { length: 10, enum: themeColor }).default("default"),
	language: varchar("language", { length: 10 }).default("system"),
	lastSelectedChatId: varchar("last_selected_chat_id", { length: 255 }),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});
