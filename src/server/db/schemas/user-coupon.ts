import { mysqlTable, varchar, int, timestamp, index } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { coupon } from "./coupon";
import { order } from "./order";

const userCouponStatus = ["unused", "used", "expired", "cancelled"] as const;
export type UserCouponStatus = (typeof userCouponStatus)[number];

export const userCoupon = mysqlTable("user_coupon", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	couponId: varchar("coupon_id", { length: 255 })
		.notNull()
		.references(() => coupon.id, { onDelete: "restrict" }),
	couponCode: varchar("coupon_code", { length: 50 }).notNull(), // 实际使用的优惠券码（冗余，便于对账）
	status: varchar("status", { length: 20, enum: userCouponStatus })
		.$defaultFn(() => "unused")
		.notNull(), // unused:未使用, used:已使用, expired:已过期, cancelled:已作废
	orderId: varchar("order_id", { length: 255 }), // 关联的订单ID（使用后填充）
	discountAmount: int("discount_amount"), // 实际抵扣金额（单位分，使用后填充）
	receivedAt: timestamp("received_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(), // 领取时间
	usedAt: timestamp("used_at"), // 使用时间
	expiredAt: timestamp("expired_at"), // 过期时间（冗余优惠券模板的end_at，避免模板修改影响）
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
}, (t) => [
	index("idx_user_coupon").on(t.userId, t.couponId), // 复合索引：查询用户的某类优惠券
	index("idx_user_status").on(t.userId, t.status), // 复合索引：查询用户未使用/已使用优惠券
	index("idx_order_id").on(t.orderId), // 索引：查询订单使用的优惠券
	index("idx_coupon_code").on(t.couponCode), // 索引：根据优惠券码查询
]);
