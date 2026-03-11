import { mysqlTable, varchar, int, timestamp, text, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { subscribe } from "./subscribe";
import { userCoupon } from "./user-coupon";

const orderStatus = ["pending", "paid", "cancelled", "refunded", "expired"] as const;
export type OrderStatus = (typeof orderStatus)[number];

const paymentMethod = ["alipay", "wechat", "stripe", "paypal", "credit_card", "bank_transfer", "other"] as const;
export type PaymentMethod = (typeof paymentMethod)[number];

export const order = mysqlTable("order", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	subscribeId: varchar("subscribe_id", { length: 255 })
		.notNull()
		.references(() => subscribe.id, { onDelete: "restrict" }),
	orderNo: varchar("order_no", { length: 64 }).notNull().unique(), // 订单号，对外展示
	type: varchar("type", { length: 20 }).notNull(), // 订单类型：subscription/credits
	totalAmount: int("total_amount").notNull(), // 订单总金额（未抵扣，单位分）
	discountAmount: int("discount_amount").default(0).notNull(), // 优惠券抵扣金额（单位分）
	actualAmount: int("actual_amount").notNull(), // 订单实际支付金额（total_amount - discount_amount，单位分）
	currency: varchar("currency", { length: 10 }).default("CNY").notNull(), // 货币类型
	couponId: varchar("coupon_id", { length: 255 }), // 使用的用户优惠券ID（关联user_coupon.id）
	status: varchar("status", { length: 20, enum: orderStatus })
		.$defaultFn(() => "pending")
		.notNull(), // 订单状态
	remark: text("remark"), // 备注
	expiresAt: timestamp("expires_at"), // 订单过期时间
	cancelledAt: timestamp("cancelled_at"), // 取消时间
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	deletedAt: timestamp("deleted_at"), // 软删除时间
}, (t) => [
	index("idx_coupon_id").on(t.couponId), // 索引：查询使用某优惠券的订单
]);
