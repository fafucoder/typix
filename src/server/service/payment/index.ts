import { payment } from "@/server/db/schemas";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getContext } from "@/server/service/context";

export interface CreatePaymentData {
	userId: string;
	orderId: string;
	channel: string;
	amount: number;
	clientIp?: string;
	userAgent?: string;
	paymentData?: string;
}

export interface Payment {
	id: string;
	userId: string;
	orderId: string;
	transactionId: string | null;
	channel: string;
	amount: number;
	currency: string;
	status: string;
	clientIp: string | null;
	userAgent: string | null;
	paymentData: string | null;
	errorCode: string | null;
	errorMessage: string | null;
	remark: string | null;
	processedAt: Date | null;
	failedAt: Date | null;
	refundedAt: Date | null;
	refundAmount: number | null;
	refundTransactionId: string | null;
	refundReason: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export const paymentService = {
	createPayment: async (data: CreatePaymentData): Promise<Payment> => {
		const { db } = getContext();
		const now = new Date();

		const newPayment = {
			id: nanoid(),
			userId: data.userId,
			orderId: data.orderId,
			transactionId: null,
			channel: data.channel,
			amount: data.amount,
			currency: "CNY",
			status: "pending",
			clientIp: data.clientIp || null,
			userAgent: data.userAgent || null,
			paymentData: data.paymentData || null,
			errorCode: null,
			errorMessage: null,
			remark: null,
			processedAt: null,
			failedAt: null,
			refundedAt: null,
			refundAmount: null,
			refundTransactionId: null,
			refundReason: null,
			createdAt: now,
			updatedAt: now,
		};

		await db.insert(payment).values(newPayment);

		return newPayment as Payment;
	},

	updatePaymentStatus: async (id: string, status: string, data?: { transactionId?: string; errorCode?: string; errorMessage?: string; processedAt?: Date; failedAt?: Date }): Promise<void> => {
		const { db } = getContext();
		const updateData: any = {
			status,
			updatedAt: new Date(),
		};

		if (data?.transactionId) {
			updateData.transactionId = data.transactionId;
		}

		if (data?.errorCode) {
			updateData.errorCode = data.errorCode;
		}

		if (data?.errorMessage) {
			updateData.errorMessage = data.errorMessage;
		}

		if (status === "success" || status === "failed") {
			updateData.processedAt = data?.processedAt || new Date();
		}

		if (status === "failed") {
			updateData.failedAt = data?.failedAt || new Date();
		}

		await db.update(payment).set(updateData).where(eq(payment.id, id));
	},

	processRefund: async (id: string, refundAmount: number, refundTransactionId: string, refundReason: string): Promise<void> => {
		const { db } = getContext();
		const now = new Date();

		await db.update(payment).set({
			status: "refunded",
			refundAmount,
			refundTransactionId,
			refundReason,
			refundedAt: now,
			updatedAt: now,
		}).where(eq(payment.id, id));
	},

	getPaymentByOrderId: async (orderId: string): Promise<Payment | null> => {
		const { db } = getContext();
		const result = await db.query.payment.findFirst({
			where: eq(payment.orderId, orderId),
		});

		return result as Payment | null;
	},

	getPaymentsByUserId: async (userId: string, page: number = 1, pageSize: number = 20): Promise<{ payments: Payment[]; total: number }> => {
		const { db } = getContext();
		const offset = (page - 1) * pageSize;

		const payments = await db.query.payment.findMany({
			where: eq(payment.userId, userId),
			orderBy: [payment.createdAt],
			limit: pageSize,
			offset,
		});

		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(payment)
			.where(eq(payment.userId, userId));

		return {
			payments: payments as Payment[],
			total: countResult[0]?.count || 0,
		};
	},
};
