import { mysqlTable, varchar, int, timestamp, text, json } from "drizzle-orm/mysql-core";

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
