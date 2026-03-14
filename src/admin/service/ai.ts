import { aiProviders, aiModels, type ModelType } from "@/admin/db/schemas/ai";
import { eq, and, desc } from "drizzle-orm";
import { getContext } from "@/admin/service/context";
import { randomBytes } from "node:crypto";
import type { MySql2Database } from "drizzle-orm/mysql2";

const generateId = (): string => {
	return randomBytes(16).toString("hex");
};

// Get typed database instance
const getDb = () => {
	const { db } = getContext();
	return db as MySql2Database<Record<string, never>>;
};

// Provider types
interface CreateProviderRequest {
	providerId: string;
	name: string;
	endpoints?: string;
	secretKey?: string;
	enabled?: boolean;
	settings?: string;
}

interface UpdateProviderRequest {
	name?: string;
	endpoints?: string;
	secretKey?: string;
	enabled?: boolean;
	settings?: string;
}

interface ProviderResult {
	id: string;
	providerId: string;
	name: string;
	endpoints: string | null;
	secretKey: string | null;
	enabled: number;
	settings: string | null;
	createdAt: Date;
	updatedAt: Date;
	models?: ModelResult[];
}

// Model types
interface CreateModelRequest {
	providerId: string;
	modelId: string;
	name?: string;
	type: ModelType;
	description?: string;
	settings?: string;
	enabled?: boolean;
}

interface UpdateModelRequest {
	modelId?: string;
	name?: string;
	type?: ModelType;
	description?: string;
	settings?: string;
	enabled?: boolean;
}

interface ModelResult {
	id: string;
	providerId: string;
	modelId: string;
	name: string | null;
	type: ModelType;
	description: string | null;
	settings: string | null;
	enabled: number;
	createdAt: Date;
	updatedAt: Date;
}

// Helper function to return provider's secretKey as-is (no encryption)
const decryptProviderSecretKey = (provider: any): ProviderResult => {
	return provider;
};

// Provider service functions
const getProviders = async (): Promise<{ success: boolean; providers?: ProviderResult[]; error?: string }> => {
	const db = getDb();
	try {
		const providers = await db.select().from(aiProviders).orderBy(desc(aiProviders.createdAt));
		
		// Get models for each provider and decrypt secretKey
		const providersWithModels = await Promise.all(
			providers.map(async (provider) => {
				const models = await db
					.select()
					.from(aiModels)
					.where(eq(aiModels.providerId, provider.id))
					.orderBy(desc(aiModels.createdAt));
				return {
					...decryptProviderSecretKey(provider),
					models: models as ModelResult[],
				};
			})
		);
		
		return { success: true, providers: providersWithModels };
	} catch (error: any) {
		console.error("Get providers error:", error);
		return { success: false, error: error.message || "Failed to get providers" };
	}
};

const getProviderById = async (id: string): Promise<{ success: boolean; provider?: ProviderResult; error?: string }> => {
	const db = getDb();
	try {
		const providers = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1);
		if (providers.length === 0) {
			return { success: false, error: "Provider not found" };
		}
		
		const models = await db
			.select()
			.from(aiModels)
			.where(eq(aiModels.providerId, id))
			.orderBy(desc(aiModels.createdAt));
		
		return { 
			success: true, 
			provider: {
				...decryptProviderSecretKey(providers[0]),
				models: models as ModelResult[],
			} as ProviderResult,
		};
	} catch (error: any) {
		console.error("Get provider error:", error);
		return { success: false, error: error.message || "Failed to get provider" };
	}
};

const createProvider = async (req: CreateProviderRequest): Promise<{ success: boolean; id?: string; error?: string }> => {
	const db = getDb();
	try {
		// Check if providerId already exists
		const existing = await db
			.select()
			.from(aiProviders)
			.where(eq(aiProviders.providerId, req.providerId))
			.limit(1);
		
		if (existing.length > 0) {
			return { success: false, error: "Provider ID already exists" };
		}
		
		const id = generateId();
		await db.insert(aiProviders).values({
			id,
			providerId: req.providerId,
			name: req.name,
			endpoints: req.endpoints || null,
			secretKey: req.secretKey || null,
			enabled: req.enabled ? 1 : 0,
			settings: req.settings || null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		
		return { success: true, id };
	} catch (error: any) {
		console.error("Create provider error:", error);
		return { success: false, error: error.message || "Failed to create provider" };
	}
};

const updateProvider = async (id: string, req: UpdateProviderRequest): Promise<{ success: boolean; id?: string; error?: string }> => {
	const db = getDb();
	try {
		const updateData: any = {
			updatedAt: new Date(),
		};
		
		if (req.name !== undefined) updateData.name = req.name;
		if (req.endpoints !== undefined) updateData.endpoints = req.endpoints || null;
		// Store secretKey as-is (no encryption)
		if (req.secretKey !== undefined) {
			updateData.secretKey = req.secretKey || null;
		}
		if (req.enabled !== undefined) updateData.enabled = req.enabled ? 1 : 0;
		if (req.settings !== undefined) updateData.settings = req.settings || null;
		
		await db.update(aiProviders).set(updateData).where(eq(aiProviders.id, id));
		
		return { success: true, id };
	} catch (error: any) {
		console.error("Update provider error:", error);
		return { success: false, error: error.message || "Failed to update provider" };
	}
};

const deleteProvider = async (id: string): Promise<{ success: boolean; error?: string }> => {
	const db = getDb();
	try {
		// Delete associated models first
		await db.delete(aiModels).where(eq(aiModels.providerId, id));
		// Delete provider
		await db.delete(aiProviders).where(eq(aiProviders.id, id));
		
		return { success: true };
	} catch (error: any) {
		console.error("Delete provider error:", error);
		return { success: false, error: error.message || "Failed to delete provider" };
	}
};

const toggleProviderEnabled = async (id: string): Promise<{ success: boolean; enabled?: boolean; error?: string }> => {
	const db = getDb();
	try {
		const providers = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1);
		if (!providers || providers.length === 0) {
			return { success: false, error: "Provider not found" };
		}
		
		const provider = providers[0]!;
		const newEnabled = provider.enabled === 1 ? 0 : 1;
		await db
			.update(aiProviders)
			.set({ enabled: newEnabled, updatedAt: new Date() })
			.where(eq(aiProviders.id, id));
		
		return { success: true, enabled: newEnabled === 1 };
	} catch (error: any) {
		console.error("Toggle provider error:", error);
		return { success: false, error: error.message || "Failed to toggle provider" };
	}
};

// Model service functions
const getModels = async (providerId?: string): Promise<{ success: boolean; models?: ModelResult[]; error?: string }> => {
	const db = getDb();
	try {
		let query = db.select().from(aiModels) as any;
		if (providerId) {
			query = query.where(eq(aiModels.providerId, providerId));
		}
		const models = await query.orderBy(desc(aiModels.createdAt));
		
		return { success: true, models: models as ModelResult[] };
	} catch (error: any) {
		console.error("Get models error:", error);
		return { success: false, error: error.message || "Failed to get models" };
	}
};

const getModelById = async (id: string): Promise<{ success: boolean; model?: ModelResult; error?: string }> => {
	const db = getDb();
	try {
		const models = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
		if (models.length === 0) {
			return { success: false, error: "Model not found" };
		}
		
		return { success: true, model: models[0] as ModelResult };
	} catch (error: any) {
		console.error("Get model error:", error);
		return { success: false, error: error.message || "Failed to get model" };
	}
};

const createModel = async (req: CreateModelRequest): Promise<{ success: boolean; id?: string; error?: string }> => {
	const db = getDb();
	try {
		// Check if provider exists
		const providers = await db
			.select()
			.from(aiProviders)
			.where(eq(aiProviders.id, req.providerId))
			.limit(1);
		
		if (providers.length === 0) {
			return { success: false, error: "Provider not found" };
		}
		
		// Check if modelId already exists for this provider
		const existing = await db
			.select()
			.from(aiModels)
			.where(and(
				eq(aiModels.providerId, req.providerId),
				eq(aiModels.modelId, req.modelId)
			))
			.limit(1);
		
		if (existing.length > 0) {
			return { success: false, error: "Model ID already exists for this provider" };
		}
		
		const id = generateId();
		await db.insert(aiModels).values({
			id,
			providerId: req.providerId,
			modelId: req.modelId,
			name: req.name || null,
			type: req.type,
			description: req.description || null,
			settings: req.settings || null,
			enabled: req.enabled ? 1 : 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		
		return { success: true, id };
	} catch (error: any) {
		console.error("Create model error:", error);
		return { success: false, error: error.message || "Failed to create model" };
	}
};

const updateModel = async (id: string, req: UpdateModelRequest): Promise<{ success: boolean; id?: string; error?: string }> => {
	const db = getDb();
	try {
		const updateData: any = {
			updatedAt: new Date(),
		};
		
		if (req.modelId !== undefined) updateData.modelId = req.modelId;
		if (req.name !== undefined) updateData.name = req.name || null;
		if (req.type !== undefined) updateData.type = req.type;
		if (req.description !== undefined) updateData.description = req.description || null;
		if (req.settings !== undefined) updateData.settings = req.settings || null;
		if (req.enabled !== undefined) updateData.enabled = req.enabled ? 1 : 0;
		
		await db.update(aiModels).set(updateData).where(eq(aiModels.id, id));
		
		return { success: true, id };
	} catch (error: any) {
		console.error("Update model error:", error);
		return { success: false, error: error.message || "Failed to update model" };
	}
};

const deleteModel = async (id: string): Promise<{ success: boolean; error?: string }> => {
	const db = getDb();
	try {
		await db.delete(aiModels).where(eq(aiModels.id, id));
		
		return { success: true };
	} catch (error: any) {
		console.error("Delete model error:", error);
		return { success: false, error: error.message || "Failed to delete model" };
	}
};

const toggleModelEnabled = async (id: string): Promise<{ success: boolean; enabled?: boolean; error?: string }> => {
	const db = getDb();
	try {
		const models = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
		if (!models || models.length === 0) {
			return { success: false, error: "Model not found" };
		}
		
		const model = models[0]!;
		const newEnabled = model.enabled === 1 ? 0 : 1;
		await db
			.update(aiModels)
			.set({ enabled: newEnabled, updatedAt: new Date() })
			.where(eq(aiModels.id, id));
		
		return { success: true, enabled: newEnabled === 1 };
	} catch (error: any) {
		console.error("Toggle model error:", error);
		return { success: false, error: error.message || "Failed to toggle model" };
	}
};

// Service class
class AiService {
	// Provider methods
	getProviders = getProviders;
	getProviderById = getProviderById;
	createProvider = createProvider;
	updateProvider = updateProvider;
	deleteProvider = deleteProvider;
	toggleProviderEnabled = toggleProviderEnabled;
	
	// Model methods
	getModels = getModels;
	getModelById = getModelById;
	createModel = createModel;
	updateModel = updateModel;
	deleteModel = deleteModel;
	toggleModelEnabled = toggleModelEnabled;
}

export const aiService = new AiService();
export type AiServiceType = typeof aiService;
