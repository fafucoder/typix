import { mysqlTable, varchar, int, timestamp, index, unique, text } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { subscribe } from "./subscribe";
import { aiModels } from "./ai";
import { order } from "./order";

// 用户用量统计表 - 记录每个用户、每个套餐、每个模型的使用量
export const modelUsageStats = mysqlTable(
	"model_usage_stats",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		orderId: varchar("order_id", { length: 255 })
			.notNull(),
		modelId: varchar("model_id", { length: 255 })
			.notNull()
			.references(() => aiModels.id, { onDelete: "cascade" }),
		usageCount: int("usage_count").default(0).notNull(),
		createdAt: timestamp("created_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(t) => [
		unique().on(t.userId, t.orderId, t.modelId),
		index("idx_user_id").on(t.userId),
		index("idx_order_id").on(t.orderId),
		index("idx_model_id").on(t.modelId),
	],
);

// 模型使用明细表 - 记录每次使用的详细信息
export const modelUsageDetails = mysqlTable(
	"model_usage_details",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		orderId: varchar("order_id", { length: 255 })
			.notNull()
			.references(() => order.id, { onDelete: "cascade" }),
		modelId: varchar("model_id", { length: 255 })
			.notNull()
			.references(() => aiModels.id, { onDelete: "cascade" }),
		generationId: varchar("generation_id", { length: 255 }),
		usageType: varchar("usage_type", { length: 50 }).notNull(),
		count: int("count").default(1).notNull(),
		metadata: text("metadata"),
		createdAt: timestamp("created_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(t) => [
		index("idx_detail_user_id").on(t.userId),
		index("idx_detail_order_id").on(t.orderId),
		index("idx_detail_model_id").on(t.modelId),
		index("idx_detail_created_at").on(t.createdAt),
		index("idx_detail_usage_type").on(t.usageType),
	],
);
