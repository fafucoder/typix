import { relations } from "drizzle-orm";
import { order } from "./order";
import { subscribe, subscribeModel } from "./subscribe";
import { payment } from "./payment";
import { userCoupon } from "./user-coupon";
import { user } from "./auth";
import { chats, messages, messageGenerations, messageAttachments } from "./chat";
import { files } from "./file";
import { modelUsageStats, modelUsageDetails } from "./usage";
import { aiModels } from "./ai";

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
	models: many(subscribeModel),
}));

export const subscribeModelRelations = relations(subscribeModel, ({ one }) => ({
	subscribe: one(subscribe, {
		fields: [subscribeModel.subscribeId],
		references: [subscribe.id],
	}),
	model: one(aiModels, {
		fields: [subscribeModel.modelId],
		references: [aiModels.id],
	}),
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

// Chat relations
export const chatsRelations = relations(chats, ({ many }) => ({
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id],
	}),
	generation: one(messageGenerations, {
		fields: [messages.generationId],
		references: [messageGenerations.id],
	}),
	attachments: many(messageAttachments),
}));

export const messageGenerationsRelations = relations(messageGenerations, ({ one }) => ({
	message: one(messages, {
		fields: [messageGenerations.id],
		references: [messages.generationId],
	}),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
	message: one(messages, {
		fields: [messageAttachments.messageId],
		references: [messages.id],
	}),
	file: one(files, {
		fields: [messageAttachments.fileId],
		references: [files.id],
	}),
}));

export const modelUsageStatsRelations = relations(modelUsageStats, ({ one }) => ({
	user: one(user, {
		fields: [modelUsageStats.userId],
		references: [user.id],
	}),
	model: one(aiModels, {
		fields: [modelUsageStats.modelId],
		references: [aiModels.id],
	}),
}));

export const modelUsageDetailsRelations = relations(modelUsageDetails, ({ one }) => ({
	user: one(user, {
		fields: [modelUsageDetails.userId],
		references: [user.id],
	}),
	order: one(order, {
		fields: [modelUsageDetails.orderId],
		references: [order.id],
	}),
	model: one(aiModels, {
		fields: [modelUsageDetails.modelId],
		references: [aiModels.id],
	}),
}));
