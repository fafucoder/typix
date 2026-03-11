import { relations } from "drizzle-orm";
import { order } from "./order";
import { subscribe } from "./subscribe";
import { payment } from "./payment";
import { userCoupon } from "./user-coupon";
import { user } from "./auth";

export const orderRelations = relations(order, ({ one, many }) => ({
	subscribe: one(subscribe, {
		fields: [order.subscribeId],
		references: [subscribe.id],
	}),
	payments: many(payment),
	coupon: one(userCoupon, {
		fields: [order.couponId],
		references: [userCoupon.id],
	}),
}));

export const subscribeRelations = relations(subscribe, ({ many }) => ({
	orders: many(order),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
	order: one(order, {
		fields: [payment.orderId],
		references: [order.id],
	}),
}));

export const userCouponRelations = relations(userCoupon, ({ one, many }) => ({
	orders: many(order),
	user: one(user, {
		fields: [userCoupon.userId],
		references: [user.id],
	}),
}));
