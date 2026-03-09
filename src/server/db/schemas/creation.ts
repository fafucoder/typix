import { mysqlTable, varchar, text, int, timestamp } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

// Creation types
const creationTypes = ["text2image", "text2video"] as const;
export type CreationType = (typeof creationTypes)[number];

// Aspect ratios
const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export type AspectRatio = (typeof aspectRatios)[number];

// Creation statuses
const creationStatuses = ["pending", "generating", "completed", "failed"] as const;
export type CreationStatus = (typeof creationStatuses)[number];

// Creation table - stores user creation history for image/video generation
export const creations = mysqlTable(
	"creations",
	{
		id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
		title: text("title").notNull(),
		userId: varchar("user_id", { length: 255 }).notNull(),
		provider: text("provider").notNull(), // AI provider used
		model: text("model").notNull(), // AI model used
		type: varchar("type", { length: 20, enum: creationTypes }).notNull(), // Creation type
		prompt: text("prompt").notNull(), // User's prompt
		aspectRatio: varchar("aspect_ratio", { length: 10, enum: aspectRatios }).default("1:1"),
		imageCount: int("image_count").default(1), // Number of images to generate
		status: varchar("status", { length: 20, enum: creationStatuses }).default("pending"),
		resultUrls: text("result_urls"), // JSON array of result image/video URLs
		errorMessage: text("error_message"), // Error message if failed
		deleted: int("deleted").default(0), // 0=false, 1=true
		createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
		updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
	}
);

export type Creation = typeof creations.$inferSelect;
export type NewCreation = typeof creations.$inferInsert;
