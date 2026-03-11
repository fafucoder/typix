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
	transactionId: varchar("transaction_id", { length: 255 }), // 第三方支付平台的交易号
	channel: varchar("channel", { length: 20, enum: paymentChannel }).notNull(), // 支付渠道：alipay/wechat/stripe/paypal/credit_card/bank_transfer/other
	amount: int("amount").notNull(), // 支付金额，单位：分
	currency: varchar("currency", { length: 10 }).default("CNY").notNull(), // 货币类型
	status: varchar("status", { length: 20, enum: paymentStatus })
		.$defaultFn(() => "pending")
		.notNull(), // 支付状态：pending/processing/success/failed/cancelled/refunded
	clientIp: varchar("client_ip", { length: 64 }), // 客户端IP
	userAgent: text("user_agent"), // 客户端User-Agent
	paymentData: text("payment_data"), // 支付数据（JSON格式，存储第三方返回的原始数据）
	errorCode: varchar("error_code", { length: 50 }), // 错误码
	errorMessage: text("error_message"), // 错误信息
	remark: text("remark"), // 备注
	processedAt: timestamp("processed_at"), // 处理完成时间
	failedAt: timestamp("failed_at"), // 失败时间
	refundedAt: timestamp("refunded_at"), // 退款时间
	refundAmount: int("refund_amount"), // 退款金额，单位：分
	refundTransactionId: varchar("refund_transaction_id", { length: 255 }), // 退款交易号
	refundReason: text("refund_reason"), // 退款原因
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});
