import { mysqlTable, varchar, text, int, timestamp, double } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";
import { files } from "./file";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

// Chat table - represents conversation sessions
export const chats = mysqlTable("chats", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	title: text("title").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	provider: text("provider").notNull(), // Current AI provider for the chat
	model: text("model").notNull(), // Current AI model for the chat
	type: varchar("type", { length: 10, enum: ["text2image", "text2video"] }).default("text2image").notNull(), // Chat type
	deleted: int("deleted").default(0), // 0=false, 1=true
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

const errorReason = [
	"CONFIG_INVALID",
	"CONFIG_ERROR",
	"API_ERROR",
	"TOO_MANY_REQUESTS",
	"TIMEOUT",
	"PROMPT_FLAGGED",
	"INPUT_IMAGE_FLAGGED",
	"UNKNOWN",
] as const;
export type ErrorReason = (typeof errorReason)[number];

// Generations table - stores AI generation requests and results (images, videos, etc.)
export const messageGenerations = mysqlTable("message_generations", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	type: varchar("type", { length: 10, enum: ["image", "video"] })
		.default("image")
		.notNull(), // Generation type
	userId: varchar("user_id", { length: 255 }).notNull(), // User ID who requested the generation
	prompt: text("prompt").notNull(), // Original text prompt for generation
	parameters: text("parameters"), // parameters as JSON
	provider: text("provider").notNull(), // AI provider used for generation
	model: text("model").notNull(), // AI model used for generation
	taskId: varchar("task_id", { length: 255 }), // AI provider's task ID for video generation
	status: varchar("status", { length: 20, enum: ["pending", "generating", "completed", "failed"] }).default("pending"),
	fileIds: text("file_ids"), // Array of file IDs if applicable
	errorReason: varchar("error_reason", { length: 30, enum: errorReason }), // Reason for failure if status is "failed"
	generationTime: int("generation_time"), // Time taken in milliseconds
	tokenCount: int("token_count"), // Token count used for generation
	cost: double("cost"), // Cost of generation if applicable
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

// Messages table - stores all conversation messages
export const messages = mysqlTable("messages", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(), // User ID who sent the message
	chatId: varchar("chat_id", { length: 255 })
		.references(() => chats.id, { onDelete: "cascade" })
		.notNull(),
	content: text("content").notNull(),
	role: varchar("role", { length: 20, enum: ["user", "assistant"] }).notNull(),
	type: varchar("type", { length: 10, enum: ["text", "image", "video"] })
		.default("text")
		.notNull(),
	// For image messages, this will reference the message generations table
	generationId: varchar("generation_id", { length: 255 }).references(() => messageGenerations.id, {
		onDelete: "set null",
	}),
	metadata: text("metadata"), // Store additional metadata as JSON
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

// Message attachments table - stores attachments for messages
export const messageAttachments = mysqlTable("message_attachments", {
	id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
	messageId: varchar("message_id", { length: 255 })
		.references(() => messages.id, { onDelete: "cascade" })
		.notNull(),
	fileId: varchar("file_id", { length: 255 })
		.references(() => files.id, { onDelete: "cascade" })
		.notNull(),
	type: varchar("type", { length: 10, enum: ["image"] })
		.default("image")
		.notNull(), // Attachment type, currently only image
	createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});
