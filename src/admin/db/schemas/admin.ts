import { mysqlTable, varchar, int, timestamp, text, json, unique } from "drizzle-orm/mysql-core";
import { aiModels } from "./ai";

const adminRoles = ["super_admin", "admin", "editor"] as const;
export type AdminRole = (typeof adminRoles)[number];

const adminStatus = ["active", "inactive", "suspended"] as const;
export type AdminStatus = (typeof adminStatus)[number];

export const admin = mysqlTable("admin", {
	id: varchar("id", { length: 255 }).primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: int("email_verified")
		.default(0)
		.notNull(),
	image: text("image"),
	role: varchar("role", { length: 20, enum: adminRoles }).$defaultFn(() => "admin").notNull(),
	department: varchar("department", { length: 255 }),
	permissions: json("permissions").$type<string[]>().default([]),
	status: varchar("status", { length: 20, enum: adminStatus })
		.$defaultFn(() => "active")
		.notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const adminSession = mysqlTable("admin_session", {
	id: varchar("id", { length: 255 }).primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: varchar("token", { length: 255 }).notNull().unique(),
	createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	ipAddress: varchar("ip_address", { length: 255 }),
	userAgent: text("user_agent"),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => admin.id, { onDelete: "cascade" }),
});

export const adminAccount = mysqlTable("admin_account", {
	id: varchar("id", { length: 255 }).primaryKey(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	providerId: varchar("provider_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => admin.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const adminVerification = mysqlTable("admin_verification", {
	id: varchar("id", { length: 255 }).primaryKey(),
	identifier: varchar("identifier", { length: 255 }).notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()),
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
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Creation (AI Generation) related tables
const creationStatus = ["pending", "generating", "completed", "failed"] as const;
export type CreationStatus = (typeof creationStatus)[number];

const creationType = ["text2image", "text2video"] as const;
export type CreationType = (typeof creationType)[number];

export const creation = mysqlTable("creation", {
	id: varchar("id", { length: 255 }).primaryKey(),
	title: varchar("title", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	provider: varchar("provider", { length: 255 }).notNull(),
	model: varchar("model", { length: 255 }).notNull(),
	type: varchar("type", { length: 20, enum: creationType }).notNull(),
	prompt: text("prompt").notNull(),
	aspectRatio: varchar("aspect_ratio", { length: 10 }).default("1:1").notNull(),
	imageCount: int("image_count").default(1).notNull(),
	status: varchar("status", { length: 20, enum: creationStatus })
		.$defaultFn(() => "pending")
		.notNull(),
	resultUrls: text("result_urls"),
	errorMessage: text("error_message"),
	deleted: int("deleted").default(0).notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Subscribe (订阅套餐) related tables
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

// Coupon (优惠券) related tables
const couponStatus = ["active", "inactive", "expired", "deleted"] as const;
export type CouponStatus = (typeof couponStatus)[number];

const couponType = ["percentage", "fixed_amount"] as const;
export type CouponType = (typeof couponType)[number];

export const coupon = mysqlTable("coupon", {
	id: varchar("id", { length: 255 }).primaryKey(),
	code: varchar("code", { length: 50 }).notNull().unique(), // 优惠券码
	name: varchar("name", { length: 255 }).notNull(), // 优惠券名称
	description: text("description"), // 描述
	type: varchar("type", { length: 20, enum: couponType }).notNull(), // 类型：百分比折扣/固定金额
	value: int("value").notNull(), // 折扣值（百分比或固定金额，单位：分）
	minOrderAmount: int("min_order_amount").default(0).notNull(), // 最低订单金额
	maxDiscountAmount: int("max_discount_amount"), // 最大折扣金额（百分比优惠券使用）
	usageLimit: int("usage_limit").default(0).notNull(), // 总使用次数限制，0表示无限制
	usageCount: int("usage_count").default(0).notNull(), // 已使用次数
	perUserLimit: int("per_user_limit").default(1).notNull(), // 每个用户限制使用次数
	subscribeIds: json("subscribe_ids").$type<string[]>().default([]), // 可使用的套餐ID列表，空数组表示所有套餐可用
	startAt: timestamp("start_at"), // 开始时间
	endAt: timestamp("end_at"), // 结束时间
	status: varchar("status", { length: 20, enum: couponStatus })
		.$defaultFn(() => "active")
		.notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// User Coupon (用户优惠券关联表)
const userCouponStatus = ["unused", "used", "expired"] as const;
export type UserCouponStatus = (typeof userCouponStatus)[number];

export const userCoupon = mysqlTable("user_coupon", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	couponId: varchar("coupon_id", { length: 255 })
		.notNull()
		.references(() => coupon.id, { onDelete: "cascade" }),
	status: varchar("status", { length: 20, enum: userCouponStatus })
		.$defaultFn(() => "unused")
		.notNull(),
	usedAt: timestamp("used_at"), // 使用时间
	orderId: varchar("order_id", { length: 255 }), // 关联订单ID
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});