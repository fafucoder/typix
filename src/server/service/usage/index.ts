import { eq, and, sql } from "drizzle-orm";
import { getContext } from "../context";
import { modelUsageStats } from "../../db/schemas/usage";
import { order } from "../../db/schemas/order";
import { subscribeModel } from "../../db/schemas/subscribe";
import { customAlphabet } from "nanoid/non-secure";

const generateId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

export class UsageService {
	/**
	 * 记录模型使用量
	 * @param userId 用户ID
	 * @param orderId 订单ID
	 * @param modelId 模型ID
	 * @param count 使用次数（默认为1）
	 */
	async recordUsage(userId: string, orderId: string, modelId: string, count: number = 1) {
		const { db } = getContext();

		try {
			// 检查是否已存在记录
			const existingStat = await db.query.modelUsageStats.findFirst({
				where: and(
					eq(modelUsageStats.userId, userId),
					eq(modelUsageStats.orderId, orderId),
					eq(modelUsageStats.modelId, modelId)
				),
			});

			if (existingStat) {
				// 更新现有记录
				await db
					.update(modelUsageStats)
					.set({
						usageCount: sql`${modelUsageStats.usageCount} + ${count}`,
						updatedAt: new Date(),
					})
					.where(eq(modelUsageStats.id, existingStat.id));
			} else {
				// 创建新记录
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

			return { success: true };
		} catch (error) {
			console.error("[UsageService] Error recording usage:", error);
			throw error;
		}
	}

	/**
	 * 获取用户的用量统计
	 * @param userId 用户ID
	 * @param orderId 订单ID（可选）
	 */
	async getUserUsageStats(userId: string, orderId?: string) {
		const { db } = getContext();

		try {
			let query = db.query.modelUsageStats.findMany({
				where: eq(modelUsageStats.userId, userId),
				with: {
					model: true,
				},
				orderBy: (stats, { desc }) => [desc(stats.updatedAt)],
			});

			if (orderId) {
				query = db.query.modelUsageStats.findMany({
					where: and(
						eq(modelUsageStats.userId, userId),
						eq(modelUsageStats.orderId, orderId)
					),
					with: {
						model: true,
					},
					orderBy: (stats, { desc }) => [desc(stats.updatedAt)],
				});
			}

			return await query;
		} catch (error) {
			console.error("[UsageService] Error getting user usage stats:", error);
			throw error;
		}
	}

	/**
	 * 获取订单的用量统计
	 * @param orderId 订单ID
	 */
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

	/**
	 * 获取模型的用量统计
	 * @param modelId 模型ID
	 */
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

	/**
	 * 获取用户的当前有效订单（已支付且未过期）
	 * @param userId 用户ID
	 */
	async getUserActiveOrder(userId: string) {
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
				return null;
			}

			// 检查是否过期
			if (activeOrder.expiresAt && new Date() > activeOrder.expiresAt) {
				return null;
			}

			return activeOrder;
		} catch (error) {
			console.error("[UsageService] Error getting user active order:", error);
			throw error;
		}
	}

	/**
	 * 检查用户是否有足够的额度
	 * @param userId 用户ID
	 * @param orderId 订单ID
	 * @param requiredCredits 需要的积分
	 */
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

			// 检查是否过期
			if (userOrder.expiresAt && new Date() > userOrder.expiresAt) {
				return { hasCredits: false, reason: "ORDER_EXPIRED" };
			}

			// 获取已使用量
			const usageResult = await db
				.select({ totalUsage: sql<number>`COALESCE(SUM(${modelUsageStats.usageCount}), 0)` })
				.from(modelUsageStats)
				.where(eq(modelUsageStats.orderId, orderId));

			const totalUsage = usageResult[0]?.totalUsage || 0;
			const totalCredits = userOrder.subscribe?.credits || 0;
			const remainingCredits = totalCredits - totalUsage;

			// 检查剩余额度
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

	/**
	 * 校验用户是否可以生成内容（检查订单状态和模型用量限制）
	 * @param userId 用户ID
	 * @param modelId 模型ID（数据库中的模型ID）
	 * @param requiredCount 需要的生成次数（默认为1）
	 * @returns 校验结果
	 */
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
			// 1. 获取用户的当前有效订单
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

			// 2. 检查订单是否过期
			if (activeOrder.expiresAt && new Date() > activeOrder.expiresAt) {
				return {
					canGenerate: false,
					reason: "ORDER_EXPIRED",
					orderId: activeOrder.id,
					message: "您的订单已过期，请续费或购买新套餐",
				};
			}

			// 3. 检查模型是否在套餐中
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

			// 4. 检查模型用量限制（如果 maxUsage > 0 表示有限制）
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

			// 所有校验通过
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
