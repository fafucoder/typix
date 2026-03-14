import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

const storage = ["base64", "disk", "s3"] as const;
export type Storage = (typeof storage)[number];

// Files table
export const files = mysqlTable("files", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(), // User ID who owns the file
	storage: varchar("storage", { length: 10, enum: storage }).notNull(), // Storage type
	url: text("url").notNull(), // URI or path to the file
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});
