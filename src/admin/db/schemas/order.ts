import { mysqlTable, varchar, int, timestamp, text, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { subscribe } from "./admin";

const orderStatus = ["pending", "paid", "cancelled", "refunded", "expired"] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const order = mysqlTable("order", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	subscribeId: varchar("subscribe_id", { length: 255 })
		.notNull()
		.references(() => subscribe.id, { onDelete: "restrict" }),
	orderNo: varchar("order_no", { length: 64 }).notNull().unique(),
	type: varchar("type", { length: 20 }).notNull(),
	totalAmount: int("total_amount").notNull(),
	discountAmount: int("discount_amount").default(0).notNull(),
	actualAmount: int("actual_amount").notNull(),
	currency: varchar("currency", { length: 10 }).default("CNY").notNull(),
	couponId: varchar("coupon_id", { length: 255 }),
	status: varchar("status", { length: 20, enum: orderStatus })
		.$defaultFn(() => "pending")
		.notNull(),
	remark: text("remark"),
	expiresAt: timestamp("expires_at"),
	cancelledAt: timestamp("cancelled_at"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	deletedAt: timestamp("deleted_at"),
}, (t) => [
	index("idx_coupon_id").on(t.couponId),
]);
