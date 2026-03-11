import { mysqlTable, varchar, int, timestamp, text, unique } from "drizzle-orm/mysql-core";
import { aiModels } from "./ai";

const subscribeStatus = ["active", "inactive", "deleted"] as const;
export type SubscribeStatus = (typeof subscribeStatus)[number];

const subscribeType = ["subscription", "credits"] as const;
export type SubscribeType = (typeof subscribeType)[number];

export const subscribe = mysqlTable("subscribe", {
	id: varchar("id", { length: 255 }).primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	type: varchar("type", { length: 20, enum: subscribeType }).notNull(),
	price: int("price").notNull(), // 价格，单位：分
	originalPrice: int("original_price"), // 原价，单位：分
	credits: int("credits").default(0).notNull(), // 包含的积分/次数
	duration: int("duration").default(0).notNull(), // 订阅时长（天），0表示永久
	sortOrder: int("sort_order").default(0).notNull(), // 排序
	isPopular: int("is_popular").default(0).notNull(), // 是否最受欢迎 (1=true, 0=false)
	status: varchar("status", { length: 20, enum: subscribeStatus })
		.$defaultFn(() => "active")
		.notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	deletedAt: timestamp("deleted_at"), // 软删除时间，null表示未删除
});

// Subscribe Model association table (套餐与模型的关联关系)
export const subscribeModel = mysqlTable("subscribe_model", {
	id: varchar("id", { length: 255 }).primaryKey(),
	subscribeId: varchar("subscribe_id", { length: 255 })
		.notNull()
		.references(() => subscribe.id, { onDelete: "cascade" }),
	modelId: varchar("model_id", { length: 255 })
		.notNull()
		.references(() => aiModels.id, { onDelete: "cascade" }),
	// 模型使用额度配置
	maxUsage: int("max_usage").default(0).notNull(), // 最大使用次数，0表示无限制
	// 其他配置
	enabled: int("enabled").default(1).notNull(), // 是否启用 (1=true, 0=false)
	sortOrder: int("sort_order").default(0).notNull(), // 排序
	// 时间戳
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
}, (t) => [
	unique().on(t.subscribeId, t.modelId), // 确保每个套餐和模型的组合唯一
]);
