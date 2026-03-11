import { eq, and, isNull, desc } from "drizzle-orm";
import { subscribe, subscribeModel } from "@/server/db/schemas/subscribe";
import { aiModels, aiProviders, type ModelType } from "@/server/db/schemas/ai";
import { order } from "@/server/db/schemas/order";
import { getContext } from "@/server/service/context";
import { pool } from "@/server/db/mysql";

export interface SubscribeWithModels {
	id: string;
	name: string;
	description: string | null;
	type: "subscription" | "credits";
	price: number;
	originalPrice: number | null;
	credits: number;
	duration: number;
	sortOrder: number;
	isPopular: boolean;
	status: "active" | "inactive" | "deleted";
	models: Array<{
		id: string;
		name: string;
		maxUsage: number;
		modelType: ModelType;
	}>;
}

export interface CurrentSubscription {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	status: string;
	duration: number;
	models: Array<{
		id: string;
		name: string;
		maxUsage: number;
		modelType: ModelType;
	}>;
}

export const subscribeService = {
	// Get all active subscribes with their models, grouped by duration
	getSubscribesWithModels: async (): Promise<{ success: boolean; data?: Record<string, SubscribeWithModels[]>; error?: string }> => {
		const { db } = getContext();

		try {
			// Get all active subscribes
			const subscribes = await db
				.select()
				.from(subscribe)
				.where(
					and(
						eq(subscribe.status, "active"),
						isNull(subscribe.deletedAt)
					)
				)
				.orderBy(desc(subscribe.sortOrder), desc(subscribe.id));

			// Group by duration
			const groupedByDuration: Record<string, SubscribeWithModels[]> = {
				monthly: [],
				quarterly: [],
				yearly: []
			};

			for (const sub of subscribes) {
				// Get models for this subscribe
				const models = await db
					.select({
						subscribeModel: {
							id: subscribeModel.id,
							maxUsage: subscribeModel.maxUsage,
						},
						model: {
							id: aiModels.id,
							modelId: aiModels.modelId,
							name: aiModels.name,
							type: aiModels.type,
						}
					})
					.from(subscribeModel)
					.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
					.where(
						and(
							eq(subscribeModel.subscribeId, sub.id),
							eq(subscribeModel.enabled, 1)
						)
					)
					.orderBy(desc(subscribeModel.sortOrder));

				const subscribeWithModels: SubscribeWithModels = {
					id: sub.id,
					name: sub.name,
					description: sub.description,
					type: sub.type,
					price: sub.price,
					originalPrice: sub.originalPrice,
					credits: sub.credits,
					duration: sub.duration,
					sortOrder: sub.sortOrder,
					isPopular: sub.isPopular === 1,
					status: sub.status,
					models: models.map((m: { subscribeModel: { id: string; maxUsage: number }; model: { id: string; modelId: string; name: string | null; type: ModelType } }) => ({
						id: m.subscribeModel.id,
						name: m.model.name || m.model.modelId, // 优先使用 name 字段，如果没有则使用 modelId
						maxUsage: m.subscribeModel.maxUsage,
						modelType: m.model.type
					}))
				};

				// Group by duration
				if (sub.duration <= 31) {
					groupedByDuration.monthly.push(subscribeWithModels);
				} else if (sub.duration <= 95) {
					groupedByDuration.quarterly.push(subscribeWithModels);
				} else {
					groupedByDuration.yearly.push(subscribeWithModels);
				}
			}

			// Sort each group by sortOrder + id
			for (const key of Object.keys(groupedByDuration)) {
				const group = groupedByDuration[key];
				if (group) {
					group.sort((a, b) => {
						if (b.sortOrder !== a.sortOrder) {
							return b.sortOrder - a.sortOrder;
						}
						return b.id.localeCompare(a.id);
					});
				}
			}

			return { success: true, data: groupedByDuration };
		} catch (error) {
			console.error("Error getting subscribes with models:", error);
			return { success: false, error: "Failed to get subscribes" };
		}
	},

	// Get current subscription for user
getCurrentSubscription: async (userId: string): Promise<{ success: boolean; data?: CurrentSubscription | null; error?: string }> => {
		const { db } = getContext();
		try {
			// 第一步：获取用户的最新订阅订单
			const orderResult = await db.select().from(order).where(
				and(
					eq(order.userId, userId),
					eq(order.type, "subscription"),
					eq(order.status, "paid")
				)
			).orderBy(desc(order.createdAt)).limit(1);

			if (!orderResult || orderResult.length === 0) {
				return { success: true, data: null };
			}

			const orderData = orderResult[0];
			const subscribeId = orderData.subscribeId;

			// 第二步：根据subscribeId获取订阅详情
			const subscribeResult = await db.select().from(subscribe).where(eq(subscribe.id, subscribeId)).limit(1);

			if (!subscribeResult || subscribeResult.length === 0) {
				return { success: true, data: null };
			}

			const subscribeData = subscribeResult[0];

			// 第三步：获取订阅的模型信息
			const modelsResult = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						maxUsage: subscribeModel.maxUsage,
					},
					model: {
						id: aiModels.id,
						modelId: aiModels.modelId,
						name: aiModels.name,
						type: aiModels.type,
					}
				})
				.from(subscribeModel)
				.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
				.where(
					and(
						eq(subscribeModel.subscribeId, subscribeId),
						eq(subscribeModel.enabled, 1)
					)
				)
				.orderBy(desc(subscribeModel.sortOrder));

			const currentSubscription: CurrentSubscription = {
				id: subscribeData.id,
				name: subscribeData.name,
				startDate: orderData.createdAt.toISOString(),
				endDate: orderData.expiresAt ? orderData.expiresAt.toISOString() : new Date(Date.now() + subscribeData.duration * 24 * 60 * 60 * 1000).toISOString(),
				status: orderData.status,
				duration: subscribeData.duration,
				models: modelsResult.map((m) => ({
					id: m.subscribeModel.id,
					name: m.model.name || m.model.modelId,
					maxUsage: m.subscribeModel.maxUsage,
					modelType: m.model.type
				}))
			};

			return { success: true, data: currentSubscription };
		} catch (error) {
			console.error("Error getting current subscription:", error);
			return { success: false, error: "Failed to get current subscription" };
		}
	}
};
