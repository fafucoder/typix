import { eq, and, isNull, desc, or, like, not } from "drizzle-orm";
import { subscribeModel } from "@/admin/db/schemas/admin";
import { aiModels, aiProviders } from "@/admin/db/schemas/ai";
import { getContext } from "./context";

export interface SubscribeModel {
	id: string;
	subscribeId: string;
	modelId: string;
	maxUsage: number;
	enabled: number;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	// 关联信息
	model?: {
		id: string;
		modelId: string;
		name: string;
		type: string;
		providerId: string;
		provider?: {
			id: string;
			providerId: string;
			name: string;
		};
	};
}

export interface CreateSubscribeModelData {
	subscribeId: string;
	modelId: string;
	maxUsage?: number;
	enabled?: number;
	sortOrder?: number;
}

export interface UpdateSubscribeModelData {
	maxUsage?: number;
	enabled?: number;
	sortOrder?: number;
}

export const subscribeModelService = {
	// Get models for a subscribe
	getSubscribeModels: async (subscribeId: string): Promise<{ success: boolean; models?: SubscribeModel[]; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						subscribeId: subscribeModel.subscribeId,
						modelId: subscribeModel.modelId,
						maxUsage: subscribeModel.maxUsage,
						enabled: subscribeModel.enabled,
						sortOrder: subscribeModel.sortOrder,
						createdAt: subscribeModel.createdAt,
						updatedAt: subscribeModel.updatedAt,
					},
					model: {
						id: aiModels.id,
						modelId: aiModels.modelId,
						name: aiModels.name,
						type: aiModels.type,
						providerId: aiModels.providerId,
					},
					provider: {
						id: aiProviders.id,
						providerId: aiProviders.providerId,
						name: aiProviders.name,
					},
				})
				.from(subscribeModel)
				.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
				.leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
				.where(eq(subscribeModel.subscribeId, subscribeId))
				.orderBy(desc(subscribeModel.sortOrder), desc(subscribeModel.createdAt));

			const models: SubscribeModel[] = results.map((row) => ({
				id: row.subscribeModel.id,
				subscribeId: row.subscribeModel.subscribeId,
				modelId: row.subscribeModel.modelId,
				maxUsage: row.subscribeModel.maxUsage,
				enabled: row.subscribeModel.enabled,
				sortOrder: row.subscribeModel.sortOrder,
				createdAt: row.subscribeModel.createdAt.toISOString(),
				updatedAt: row.subscribeModel.updatedAt.toISOString(),
				model: row.model ? {
					id: row.model.id,
					modelId: row.model.modelId,
					name: row.model.name || '',
					type: row.model.type,
					providerId: row.model.providerId,
					provider: row.provider ? {
						id: row.provider.id,
						providerId: row.provider.providerId,
						name: row.provider.name,
					} : undefined,
				} : undefined,
			}));

			console.log('Subscribe models query results:', results);
			console.log('Mapped models:', models);

			return { success: true, models };
		} catch (error) {
			console.error("Get subscribe models error:", error);
			return { success: false, error: "Failed to get subscribe models" };
		}
	},

	// Get available models not yet assigned to subscribe
	getAvailableModels: async (subscribeId: string): Promise<{ success: boolean; models?: any[]; error?: string }> => {
		const { db } = getContext();

		try {
			// Get models already assigned to this subscribe
			const assignedModels = await db
				.select({ modelId: subscribeModel.modelId })
				.from(subscribeModel)
				.where(eq(subscribeModel.subscribeId, subscribeId));

			const assignedModelIds = assignedModels.map(m => m.modelId);

			// Get all enabled models with provider info
			const allEnabledModels = await db
				.select({
					model: aiModels,
					provider: {
						id: aiProviders.id,
						providerId: aiProviders.providerId,
						name: aiProviders.name,
					},
				})
				.from(aiModels)
				.leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
				.where(eq(aiModels.enabled, 1))
				.orderBy(aiProviders.name, aiModels.name);

			// Filter out models already assigned to this subscribe
			const availableModels = allEnabledModels.filter(({ model }) => {
				return !assignedModelIds.includes(model.id);
			});

			return { success: true, models: availableModels };
		} catch (error) {
			console.error("Get available models error:", error);
			return { success: false, error: "Failed to get available models" };
		}
	},

	// Create subscribe model
	createSubscribeModel: async (data: CreateSubscribeModelData): Promise<{ success: boolean; model?: SubscribeModel; error?: string }> => {
		const { db } = getContext();

		try {
			const id = crypto.randomUUID();
			const now = new Date();

			await db.insert(subscribeModel).values({
				id,
				subscribeId: data.subscribeId,
				modelId: data.modelId,
				maxUsage: data.maxUsage || 0,
				enabled: data.enabled || 1,
				sortOrder: data.sortOrder || 0,
				createdAt: now,
				updatedAt: now,
			});

			// Get the created model with model details
			const result = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						subscribeId: subscribeModel.subscribeId,
						modelId: subscribeModel.modelId,
						maxUsage: subscribeModel.maxUsage,
						enabled: subscribeModel.enabled,
						sortOrder: subscribeModel.sortOrder,
						createdAt: subscribeModel.createdAt,
						updatedAt: subscribeModel.updatedAt,
					},
					model: {
						id: aiModels.id,
						modelId: aiModels.modelId,
						name: aiModels.name,
						type: aiModels.type,
						providerId: aiModels.providerId,
					},
				})
				.from(subscribeModel)
				.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
				.where(eq(subscribeModel.id, id))
				.limit(1);

			if (result.length === 0) {
				return { success: false, error: "Failed to get created model" };
			}

			const row = result[0];
			const model: SubscribeModel = {
				id: row.subscribeModel.id,
				subscribeId: row.subscribeModel.subscribeId,
				modelId: row.subscribeModel.modelId,
				maxUsage: row.subscribeModel.maxUsage,
				enabled: row.subscribeModel.enabled,
				sortOrder: row.subscribeModel.sortOrder,
				createdAt: row.subscribeModel.createdAt.toISOString(),
				updatedAt: row.subscribeModel.updatedAt.toISOString(),
				model: row.model ? {
					id: row.model.id,
					modelId: row.model.modelId,
					name: row.model.name || '',
					type: row.model.type,
					providerId: row.model.providerId,
				} : undefined,
			};

			return { success: true, model };
		} catch (error) {
			console.error("Create subscribe model error:", error);
			return { success: false, error: "Failed to create subscribe model" };
		}
	},

	// Update subscribe model
	updateSubscribeModel: async (id: string, data: UpdateSubscribeModelData): Promise<{ success: boolean; model?: SubscribeModel; error?: string }> => {
		const { db } = getContext();

		try {
			const updateData: any = {
				updatedAt: new Date(),
			};

			if (data.maxUsage !== undefined) updateData.maxUsage = data.maxUsage;
			if (data.enabled !== undefined) updateData.enabled = data.enabled;
			if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

			await db
				.update(subscribeModel)
				.set(updateData)
				.where(eq(subscribeModel.id, id));

			// Get the updated model with model details
			const result = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						subscribeId: subscribeModel.subscribeId,
						modelId: subscribeModel.modelId,
						maxUsage: subscribeModel.maxUsage,
						enabled: subscribeModel.enabled,
						sortOrder: subscribeModel.sortOrder,
						createdAt: subscribeModel.createdAt,
						updatedAt: subscribeModel.updatedAt,
					},
					model: {
						id: aiModels.id,
						modelId: aiModels.modelId,
						name: aiModels.name,
						type: aiModels.type,
						providerId: aiModels.providerId,
					},
				})
				.from(subscribeModel)
				.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
				.where(eq(subscribeModel.id, id))
				.limit(1);

			if (result.length === 0) {
				return { success: false, error: "Subscribe model not found" };
			}

			const row = result[0];
			const model: SubscribeModel = {
				id: row.subscribeModel.id,
				subscribeId: row.subscribeModel.subscribeId,
				modelId: row.subscribeModel.modelId,
				maxUsage: row.subscribeModel.maxUsage,
				enabled: row.subscribeModel.enabled,
				sortOrder: row.subscribeModel.sortOrder,
				createdAt: row.subscribeModel.createdAt.toISOString(),
				updatedAt: row.subscribeModel.updatedAt.toISOString(),
				model: row.model ? {
					id: row.model.id,
					modelId: row.model.modelId,
					name: row.model.name || '',
					type: row.model.type,
					providerId: row.model.providerId,
				} : undefined,
			};

			return { success: true, model };
		} catch (error) {
			console.error("Update subscribe model error:", error);
			return { success: false, error: "Failed to update subscribe model" };
		}
	},

	// Delete subscribe model
	deleteSubscribeModel: async (id: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			await db
				.delete(subscribeModel)
				.where(eq(subscribeModel.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete subscribe model error:", error);
			return { success: false, error: "Failed to delete subscribe model" };
		}
	},

	// Delete multiple subscribe models
	deleteSubscribeModels: async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			for (const id of ids) {
				await db
					.delete(subscribeModel)
					.where(eq(subscribeModel.id, id));
			}

			return { success: true };
		} catch (error) {
			console.error("Delete subscribe models error:", error);
			return { success: false, error: "Failed to delete subscribe models" };
		}
	},
};
