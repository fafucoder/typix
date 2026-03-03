import { mysqlTable, varchar, int, timestamp, unique, text } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

// AI Provider table
export const aiProviders = mysqlTable(
	"ai_providers",
	{
		id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
		providerId: varchar("provider_id", { length: 255 }).notNull().unique(), // Unique identifier for the AI provider
		userId: varchar("user_id", { length: 255 }).notNull(), // User ID who owns the provider
		enabled: int("enabled").default(1).notNull(), // Whether the provider is enabled (1=true, 0=false)
		settings: text("settings"), // Provider-specific settings as JSON
		createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
		updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
	},
	(t) => [unique().on(t.userId, t.providerId)],
);

// AI Models table
export const aiModels = mysqlTable(
	"ai_models",
	{
		id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
		providerId: varchar("provider_id", { length: 255 }).notNull(), // Unique identifier for the AI provider
		modelId: varchar("model_id", { length: 255 }).notNull(), // Unique identifier for the model within the provider
		enabled: int("enabled").default(1).notNull(), // Whether the model is enabled (1=true, 0=false)
		userId: varchar("user_id", { length: 255 }).notNull(), // User ID who owns the model
		createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
		updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
	},
	(t) => [unique().on(t.userId, t.providerId, t.modelId)],
);
