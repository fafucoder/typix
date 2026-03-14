import { mysqlTable, varchar, int, timestamp, index, unique } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { subscribe } from "./subscribe";
import { aiModels } from "./ai";

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
		// 使用量统计
		usageCount: int("usage_count").default(0).notNull(), // 使用次数
		// 时间戳
		createdAt: timestamp("created_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(t) => [
		// 联合唯一索引：每个用户、每个订单、每个模型的组合唯一
		unique().on(t.userId, t.orderId, t.modelId),
		// 索引：按用户查询
		index("idx_user_id").on(t.userId),
		// 索引：按订单查询
		index("idx_order_id").on(t.orderId),
		// 索引：按模型查询
		index("idx_model_id").on(t.modelId),
	],
);
