import { order, userCoupon } from "@/server/db/schemas";
import { eq, and, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { pool } from "@/server/db/mysql";
import * as schema from "@/server/db/schemas";

let db: any = null;

const getDb = async () => {
	if (db) {
		return db;
	}
	db = drizzle(pool, {
		casing: "snake_case",
		schema: schema as any,
		mode: "default",
	});
	return db;
};

export const expireOrder = async (orderId: string) => {
	try {
		const database = await getDb();
		
		const orderResult = await database.select().from(order).where(eq(order.id, orderId)).limit(1);

		if (!orderResult || orderResult.length === 0) {
			return;
		}

		const existingOrder = orderResult[0];

		if (existingOrder.status !== "pending") {
			return;
		}

		const now = new Date();

		await database.update(order).set({
			status: "expired",
			updatedAt: now,
		}).where(eq(order.id, orderId));

		if (existingOrder.couponId) {
			await database.update(userCoupon).set({
				status: "unused",
				orderId: null,
				discountAmount: null,
				usedAt: null,
				updatedAt: now,
			}).where(eq(userCoupon.id, existingOrder.couponId));
		}
	} catch (error) {
		console.error(`Failed to expire order ${orderId}:`, error);
	}
};

const checkExpiredOrders = async () => {
	try {
		const database = await getDb();
		const now = new Date();

		const expiredOrders = await database
			.select()
			.from(order)
			.where(
				and(
					eq(order.status, "pending"),
					lt(order.expiresAt, now)
				)
			);

		for (const expiredOrder of expiredOrders) {
			await expireOrder(expiredOrder.id);
		}
	} catch (error) {
		console.error("Error checking expired orders:", error);
	}
};

export const setupOrderExpirationListener = () => {
	setInterval(async () => {
		await checkExpiredOrders();
	}, 30 * 1000);

	checkExpiredOrders();
};
