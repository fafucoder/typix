import { mysqlTable, varchar, int, timestamp, unique, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

// AI Provider table
export const aiProviders = mysqlTable(
	"ai_providers",
	{
		id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
		providerId: varchar("provider_id", { length: 255 }).notNull().unique(), // Unique identifier for the AI provider
		name: varchar("name", { length: 255 }).notNull(), // Provider display name
		endpoints: varchar("endpoints", { length: 255 }), // API endpoint URL
		secretKey: varchar("secret_key", { length: 255 }), // API secret key (encrypted)
		enabled: int("enabled").default(1).notNull(), // Whether the provider is enabled (1=true, 0=false)
		settings: text("settings"), // Provider-specific settings as JSON
		sort: int("sort").default(0).notNull(), // Sort order for drag-and-drop
		createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
		updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
	},
);

// Model types: text2image (文生图), text2video (文生视频)
const modelTypes = ["text2image", "text2video"] as const;
export type ModelType = (typeof modelTypes)[number];

// Model abilities: t2i (text to image), i2i (image to image), t2v (text to video)
const modelAbilities = ["t2i", "i2i", "t2v"] as const;
export type ModelAbility = (typeof modelAbilities)[number];

// AI Models table
export const aiModels = mysqlTable(
	"ai_models",
	{
		id: varchar("id", { length: 255 }).$defaultFn(generateId).primaryKey(),
		providerId: varchar("provider_id", { length: 255 }).notNull(), // Reference to ai provider
		modelId: varchar("model_id", { length: 255 }).notNull(), // Unique identifier for the model within the provider
		name: varchar("name", { length: 255 }).notNull().default(""), // Model display name
		type: varchar("type", { length: 20, enum: modelTypes }).notNull(), // Model type: text2image or text2video
		description: text("description"), // Model description
		settings: text("settings"), // Model configuration as JSON string
		enabled: int("enabled").default(1).notNull(), // Whether the model is enabled (1=true, 0=false)
		ability: mysqlEnum("ability", modelAbilities).notNull(), // Model ability: t2i, i2i, or t2v
		supportedAspectRatios: varchar("supported_aspect_ratios", { length: 255 }), // Supported aspect ratios as JSON array string
		sort: int("sort").default(0).notNull(), // Sort order
		maxInputImages: int("max_input_images"), // Maximum number of input images supported (for i2i models)
		videoDurations: text("video_durations"), // Video durations (for t2v models)
		createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
		updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
	},
	(t) => [unique().on(t.providerId, t.modelId)],
);
