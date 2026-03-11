import { mysqlTable, varchar, int, timestamp, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { subscribe } from "./admin";

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
	orderNo: varchar("order_no", { length: 64 }).notNull().unique(),
	type: varchar("type", { length: 20 }).notNull(),
	amount: int("amount").notNull(),
	currency: varchar("currency", { length: 10 }).default("CNY").notNull(),
	status: varchar("status", { length: 20, enum: orderStatus })
		.$defaultFn(() => "pending")
		.notNull(),
	paymentMethod: varchar("payment_method", { length: 20, enum: paymentMethod }),
	paymentId: varchar("payment_id", { length: 255 }),
	clientIp: varchar("client_ip", { length: 64 }),
	userAgent: text("user_agent"),
	remark: text("remark"),
	paidAt: timestamp("paid_at"),
	expiresAt: timestamp("expires_at"),
	cancelledAt: timestamp("cancelled_at"),
	refundedAt: timestamp("refunded_at"),
	refundAmount: int("refund_amount"),
	refundReason: text("refund_reason"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	deletedAt: timestamp("deleted_at"),
});
