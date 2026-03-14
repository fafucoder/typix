import { eq, and, sql, gte, lte, between, desc } from "drizzle-orm";
import { getContext } from "../context";
import { modelUsageStats, modelUsageDetails } from "../../db/schemas/usage";
import { order } from "../../db/schemas/order";
import { subscribeModel } from "../../db/schemas/subscribe";
import { aiModels } from "../../db/schemas/ai";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

export interface RecordUsageOptions {
	userId: string;
	orderId: string;
	modelId: string;
	count?: number;
	usageType: string;
	generationId?: string;
	metadata?: string;
}

export class UsageService {
	async recordUsage(options: RecordUsageOptions) {
		const { db } = getContext();
		const { userId, orderId, modelId, count = 1, usageType, generationId, metadata } = options;

		try {
			const existingStat = await db.query.modelUsageStats.findFirst({
				where: and(
					eq(modelUsageStats.userId, userId),
					eq(modelUsageStats.orderId, orderId),
					eq(modelUsageStats.modelId, modelId)
				),
			});

			if (existingStat) {
				await db
					.update(modelUsageStats)
					.set({
						usageCount: sql`${modelUsageStats.usageCount} + ${count}`,
						updatedAt: new Date(),
					})
					.where(eq(modelUsageStats.id, existingStat.id));
			} else {
				await db.insert(modelUsageStats).values({
					id: generateId(),
					userId,
					orderId,
					modelId,
					usageCount: count,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			await db.insert(modelUsageDetails).values({
				id: generateId(),
				userId,
				orderId,
				modelId,
				usageType,
				count,
				generationId,
				metadata,
				createdAt: new Date(),
			});

			return { success: true };
		} catch (error) {
			console.error("[UsageService] Error recording usage:", error);
			throw error;
		}
	}

	async getUserUsageDetails(
		userId: string,
		options?: {
			orderId?: string;
			modelId?: string;
			usageType?: string;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
		}
	) {
		const { db } = getContext();

		try {
			const conditions: any[] = [eq(modelUsageDetails.userId, userId)];

			if (options?.orderId) {
				conditions.push(eq(modelUsageDetails.orderId, options.orderId));
			}
			if (options?.modelId) {
				conditions.push(eq(modelUsageDetails.modelId, options.modelId));
			}
			if (options?.usageType) {
				conditions.push(eq(modelUsageDetails.usageType, options.usageType));
			}
			if (options?.startDate && options?.endDate) {
				conditions.push(between(modelUsageDetails.createdAt, options.startDate, options.endDate));
			} else if (options?.startDate) {
				conditions.push(gte(modelUsageDetails.createdAt, options.startDate));
			} else if (options?.endDate) {
				conditions.push(lte(modelUsageDetails.createdAt, options.endDate));
			}

			const details = await db.query.modelUsageDetails.findMany({
				where: and(...conditions),
				with: {
					model: true,
				},
				orderBy: [desc(modelUsageDetails.createdAt)],
				limit: options?.limit || 100,
			});

			return details;
		} catch (error) {
			console.error("[UsageService] Error getting user usage details:", error);
			throw error;
		}
	}

	async getModelDailyUsage(
		modelId: string,
		options?: {
			startDate?: Date;
			endDate?: Date;
		}
	) {
		const { db } = getContext();

		try {
			const conditions: any[] = [eq(modelUsageDetails.modelId, modelId)];

			if (options?.startDate && options?.endDate) {
				conditions.push(between(modelUsageDetails.createdAt, options.startDate, options.endDate));
			}

			const result = await db
				.select({
					date: sql<string>`DATE(${modelUsageDetails.createdAt})`,
					totalCount: sql<number>`SUM(${modelUsageDetails.count})`,
					usageCount: sql<number>`COUNT(*)`,
				})
				.from(modelUsageDetails)
				.where(and(...conditions))
				.groupBy(sql`DATE(${modelUsageDetails.createdAt})`)
				.orderBy(sql`DATE(${modelUsageDetails.createdAt}) DESC`);

			return result;
		} catch (error) {
			console.error("[UsageService] Error getting model daily usage:", error);
			throw error;
		}
	}

	async getUserDailyUsage(
		userId: string,
		options?: {
			modelId?: string;
			startDate?: Date;
			endDate?: Date;
		}
	) {
		const { db } = getContext();

		try {
			const conditions: any[] = [eq(modelUsageDetails.userId, userId)];

			if (options?.modelId) {
				conditions.push(eq(modelUsageDetails.modelId, options.modelId));
			}
			if (options?.startDate && options?.endDate) {
				conditions.push(between(modelUsageDetails.createdAt, options.startDate, options.endDate));
			}

			const result = await db
				.select({
					date: sql<string>`DATE(${modelUsageDetails.createdAt})`,
					modelId: modelUsageDetails.modelId,
					totalCount: sql<number>`SUM(${modelUsageDetails.count})`,
					usageCount: sql<number>`COUNT(*)`,
				})
				.from(modelUsageDetails)
				.where(and(...conditions))
				.groupBy(sql`DATE(${modelUsageDetails.createdAt})`, modelUsageDetails.modelId)
				.orderBy(sql`DATE(${modelUsageDetails.createdAt}) DESC`);

			return result;
		} catch (error) {
			console.error("[UsageService] Error getting user daily usage:", error);
			throw error;
		}
	}

	async getUserUsageStats(userId: string, orderId?: string) {
		const { db } = getContext();

		try {
			const activeOrder = await this.getUserActiveOrder(userId);
			
			if (!activeOrder) {
				return [];
			}

			// 使用 innerJoin 确保只返回存在的模型（与 /api/subscribes/current 保持一致）
			const modelConfigs = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						modelId: subscribeModel.modelId,
						maxUsage: subscribeModel.maxUsage,
						sortOrder: subscribeModel.sortOrder,
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
						eq(subscribeModel.subscribeId, activeOrder.subscribeId),
						eq(subscribeModel.enabled, 1)
					)
				)
				.orderBy(desc(subscribeModel.sortOrder));

			const conditions: any[] = [
				eq(modelUsageStats.userId, userId),
				eq(modelUsageStats.orderId, activeOrder.id)
			];

			const usageStats = await db.query.modelUsageStats.findMany({
				where: and(...conditions),
				with: {
					model: true,
				},
			});

			const usageMap = new Map(
				usageStats.map((stat) => [stat.modelId, stat])
			);

			const now = new Date();
			const result = modelConfigs.map((config) => {
				const usage = usageMap.get(config.subscribeModel.modelId);
				const usageCount = usage?.usageCount || 0;
				const maxUsage = config.subscribeModel.maxUsage || 0;
				const remainingUsage = maxUsage > 0 ? Math.max(0, maxUsage - usageCount) : 0;

				return {
					id: usage?.id || `${userId}-${activeOrder.id}-${config.subscribeModel.modelId}`,
					userId,
					orderId: activeOrder.id,
					modelId: config.subscribeModel.modelId,
					usageCount,
					maxUsage,
					remainingUsage,
					createdAt: usage?.createdAt || now,
					updatedAt: usage?.updatedAt || now,
					model: config.model,
				};
			});
			return result;
		} catch (error) {
			console.error("[UsageService] Error getting user usage stats:", error);
			throw error;
		}
	}

	async getOrderUsageStats(orderId: string) {
		const { db } = getContext();

		try {
			const stats = await db.query.modelUsageStats.findMany({
				where: eq(modelUsageStats.orderId, orderId),
				with: {
					user: true,
					model: true,
				},
				orderBy: (stats, { desc }) => [desc(stats.usageCount)],
			});

			return stats;
		} catch (error) {
			console.error("[UsageService] Error getting order usage stats:", error);
			throw error;
		}
	}

	async getModelUsageStats(modelId: string) {
		const { db } = getContext();

		try {
			const stats = await db.query.modelUsageStats.findMany({
				where: eq(modelUsageStats.modelId, modelId),
				with: {
					user: true,
				},
				orderBy: (stats, { desc }) => [desc(stats.usageCount)],
			});

			return stats;
		} catch (error) {
			console.error("[UsageService] Error getting model usage stats:", error);
			throw error;
		}
	}

	async getUserActiveOrder(userId: string) {
		const { db } = getContext();

		try {
			const activeOrder = await db.query.order.findFirst({
				where: and(
					eq(order.userId, userId),
					eq(order.status, "paid"),
					eq(order.type, "subscription")
				),
				orderBy: (o, { desc }) => [desc(o.createdAt)],
				with: {
					subscribe: true,
				},
			});

			if (!activeOrder) {
				return null;
			}

			if (activeOrder.expiresAt && new Date() > activeOrder.expiresAt) {
				return null;
			}

			return activeOrder;
		} catch (error) {
			console.error("[UsageService] Error getting user active order:", error);
			throw error;
		}
	}

	async checkUserCredits(userId: string, orderId: string, requiredCredits: number = 1) {
		const { db } = getContext();

		try {
			const userOrder = await db.query.order.findFirst({
				where: and(
					eq(order.id, orderId),
					eq(order.userId, userId),
					eq(order.status, "paid")
				),
				with: {
					subscribe: true,
				},
			});

			if (!userOrder) {
				return { hasCredits: false, reason: "NO_ACTIVE_ORDER" };
			}

			if (userOrder.expiresAt && new Date() > userOrder.expiresAt) {
				return { hasCredits: false, reason: "ORDER_EXPIRED" };
			}

			const usageResult = await db
				.select({ totalUsage: sql<number>`COALESCE(SUM(${modelUsageStats.usageCount}), 0)` })
				.from(modelUsageStats)
				.where(eq(modelUsageStats.orderId, orderId));

			const totalUsage = usageResult[0]?.totalUsage || 0;
			const totalCredits = userOrder.subscribe?.credits || 0;
			const remainingCredits = totalCredits - totalUsage;

			if (remainingCredits < requiredCredits) {
				return { hasCredits: false, reason: "INSUFFICIENT_CREDITS", remainingCredits };
			}

			return {
				hasCredits: true,
				remainingCredits,
				totalCredits,
				usedCredits: totalUsage,
			};
		} catch (error) {
			console.error("[UsageService] Error checking user credits:", error);
			throw error;
		}
	}

	async validateGenerationPermission(
		userId: string,
		modelId: string,
		requiredCount: number = 1
	): Promise<{
		canGenerate: boolean;
		reason?: "NO_ACTIVE_ORDER" | "ORDER_EXPIRED" | "MODEL_NOT_IN_SUBSCRIPTION" | "MODEL_USAGE_EXCEEDED";
		orderId?: string;
		message?: string;
	}> {
		const { db } = getContext();

		try {
			const activeOrder = await db.query.order.findFirst({
				where: and(
					eq(order.userId, userId),
					eq(order.status, "paid")
				),
				orderBy: (o, { desc }) => [desc(o.createdAt)],
				with: {
					subscribe: true,
				},
			});

			if (!activeOrder) {
				return {
					canGenerate: false,
					reason: "NO_ACTIVE_ORDER",
					message: "您没有有效的订单，请先购买套餐",
				};
			}

			if (activeOrder.expiresAt && new Date() > activeOrder.expiresAt) {
				return {
					canGenerate: false,
					reason: "ORDER_EXPIRED",
					orderId: activeOrder.id,
					message: "您的订单已过期，请续费或购买新套餐",
				};
			}

			const subscribeModelConfig = await db.query.subscribeModel.findFirst({
				where: and(
					eq(subscribeModel.subscribeId, activeOrder.subscribeId),
					eq(subscribeModel.modelId, modelId),
					eq(subscribeModel.enabled, 1)
				),
			});

			if (!subscribeModelConfig) {
				return {
					canGenerate: false,
					reason: "MODEL_NOT_IN_SUBSCRIPTION",
					orderId: activeOrder.id,
					message: "当前套餐不包含此模型，请升级套餐",
				};
			}

			if (subscribeModelConfig.maxUsage > 0) {
				const usageResult = await db
					.select({ totalUsage: sql<number>`COALESCE(SUM(${modelUsageStats.usageCount}), 0)` })
					.from(modelUsageStats)
					.where(
						and(
							eq(modelUsageStats.orderId, activeOrder.id),
							eq(modelUsageStats.modelId, modelId)
						)
					);

				const currentUsage = usageResult[0]?.totalUsage || 0;
				const remainingUsage = subscribeModelConfig.maxUsage - currentUsage;

				if (remainingUsage < requiredCount) {
					return {
						canGenerate: false,
						reason: "MODEL_USAGE_EXCEEDED",
						orderId: activeOrder.id,
						message: `该模型的使用次数已达上限（${subscribeModelConfig.maxUsage}次），请升级套餐或等待重置`,
					};
				}
			}

			return {
				canGenerate: true,
				orderId: activeOrder.id,
			};
		} catch (error) {
			console.error("[UsageService] Error validating generation permission:", error);
			throw error;
		}
	}
}

export const usageService = new UsageService();
