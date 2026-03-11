import { mysqlTable, varchar, int, timestamp, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { order } from "./order";

const paymentStatus = ["pending", "processing", "success", "failed", "cancelled", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatus)[number];

const paymentChannel = ["alipay", "wechat", "stripe", "paypal", "credit_card", "bank_transfer", "other"] as const;
export type PaymentChannel = (typeof paymentChannel)[number];

export const payment = mysqlTable("payment", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	orderId: varchar("order_id", { length: 255 })
		.notNull()
		.references(() => order.id, { onDelete: "cascade" }),
	transactionId: varchar("transaction_id", { length: 255 }),
	channel: varchar("channel", { length: 20, enum: paymentChannel }).notNull(),
	amount: int("amount").notNull(),
	currency: varchar("currency", { length: 10 }).default("CNY").notNull(),
	status: varchar("status", { length: 20, enum: paymentStatus })
		.$defaultFn(() => "pending")
		.notNull(),
	clientIp: varchar("client_ip", { length: 64 }),
	userAgent: text("user_agent"),
	paymentData: text("payment_data"),
	errorCode: varchar("error_code", { length: 50 }),
	errorMessage: text("error_message"),
	remark: text("remark"),
	processedAt: timestamp("processed_at"),
	failedAt: timestamp("failed_at"),
	refundedAt: timestamp("refunded_at"),
	refundAmount: int("refund_amount"),
	refundTransactionId: varchar("refund_transaction_id", { length: 255 }),
	refundReason: text("refund_reason"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});
