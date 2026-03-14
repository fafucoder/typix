import { getProviderById as getHardcodedProviderById } from "@/server/ai/provider";
import type { ApiProviderSettings, ApiProviderSettingsItem } from "@/server/ai/types/provider";
import { aiModels, aiProviders } from "@/server/db/schemas";
import { ServiceException } from "@/server/lib/exception";
import { and, eq, inArray } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod/v4";
import { type RequestContext, getContext } from "../context";
import type { Ability, AiModel } from "@/server/ai/types/model";
import type { AspectRatio } from "@/server/ai/types/api";

// Service-level provider type that includes models for frontend consumption
export interface ServiceAiProvider {
	id: string;
	name: string;
	enabled: boolean;
	supportCors?: boolean;
	settings?: ApiProviderSettingsItem[];
	models: AiModel[];
}

// Type definitions for provider data from database
interface DbAiProvider {
	id: string;
	providerId: string;
	name: string;
	endpoints: string | null;
	secretKey: string | null;
	enabled: number;
	settings: string | null;
	sort: number;
	createdAt: Date;
	updatedAt: Date;
}

interface DbAiModel {
	id: string;
	providerId: string;
	modelId: string;
	name: string | null;
	type: "text2image" | "text2video";
	enabled: number;
	maxInputImages: number | null;
	videoDurations: string | null;
	sort: number;
	createdAt: Date;
	updatedAt: Date;
	ability: string;
	supportedAspectRatios: string[];
}

// Convert database model to service model format
const dbModelToServiceModel = (dbModel: DbAiModel): AiModel => {
	let supportedAspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
	let videoDurations: number[] | undefined = undefined;
	
	// Parse supportedAspectRatios from JSON if available
	if (dbModel.supportedAspectRatios) {
		try {
			const parsed = typeof dbModel.supportedAspectRatios === 'string' 
				? JSON.parse(dbModel.supportedAspectRatios) 
				: dbModel.supportedAspectRatios;
			if (Array.isArray(parsed) && parsed.length > 0) {
				supportedAspectRatios = parsed as AspectRatio[];
			}
		} catch (error) {
			console.error('Failed to parse supportedAspectRatios:', error);
		}
	}
	
	// Parse videoDurations from JSON if available
	if (dbModel.videoDurations) {
		try {
			const parsed = typeof dbModel.videoDurations === 'string'
				? JSON.parse(dbModel.videoDurations)
				: dbModel.videoDurations;
			if (Array.isArray(parsed) && parsed.length > 0) {
				videoDurations = parsed as number[];
			}
		} catch (error) {
			console.error('Failed to parse videoDurations:', error);
		}
	}
	
	return {
		id: dbModel.modelId,
		name: dbModel.name || dbModel.modelId,
		ability: dbModel.ability as Ability,
		maxInputImages: dbModel.maxInputImages ?? 1,
		videoDurations,
		enabled: dbModel.enabled === 1,
		supportedAspectRatios,
	};
};

// Convert database provider to service provider format
const dbProviderToServiceProvider = (dbProvider: DbAiProvider, models: AiModel[]): ServiceAiProvider => {
	const hardcodedProvider = getHardcodedProviderById(dbProvider.providerId);
	const settingsSchema: ApiProviderSettingsItem[] | undefined = dbProvider.settings
		? (JSON.parse(dbProvider.settings) as ApiProviderSettingsItem[])
		: (hardcodedProvider?.settings ? (typeof hardcodedProvider.settings === 'function' ? hardcodedProvider.settings() : hardcodedProvider.settings) : undefined);

	return {
		id: dbProvider.providerId,
		name: dbProvider.name,
		enabled: dbProvider.enabled === 1,
		supportCors: hardcodedProvider?.supportCors || false,
		settings: settingsSchema,
		models: models,
	};
};

const getAiProviders = async (_ctx: RequestContext) => {
	const { db } = getContext();

	// Get all providers from database sorted by sort field
	const dbAiProviders = await db.query.aiProviders.findMany({
		orderBy: (aiProviders, { desc }) => [desc(aiProviders.sort)],
	});
	const providers: ServiceAiProvider[] = [];

	for (const dbProvider of dbAiProviders) {
		// Get models for this provider sorted by sort field
		const dbModels = await db.query.aiModels.findMany({
			where: eq(aiModels.providerId, dbProvider.id),
			orderBy: (aiModels, { desc }) => [desc(aiModels.sort)],
		});
		const serviceModels = dbModels.map(dbModel => dbModelToServiceModel(dbModel));
		const provider = dbProviderToServiceProvider(dbProvider, serviceModels);
		providers.push(provider);
	}

	return providers;
};

export const GetEnabledAiProvidersWithModelsSchema = z.object({
	modelType: z.enum(["text2image", "text2video"]).optional(),
});
export type GetEnabledAiProvidersWithModels = z.infer<typeof GetEnabledAiProvidersWithModelsSchema>;

const getEnabledAiProvidersWithModels = async (req: GetEnabledAiProvidersWithModels, _ctx: Partial<RequestContext> = {}) => {
	const { db } = getContext();
	const modelType = req.modelType;

	// Get all enabled providers from database sorted by sort field
	const dbAiProviders = await db.query.aiProviders.findMany({
		where: eq(aiProviders.enabled, 1),
		orderBy: (aiProviders, { desc }) => [desc(aiProviders.sort)],
	});

	const providers: ServiceAiProvider[] = [];

	for (const dbProvider of dbAiProviders) {
		// Get enabled models for this provider sorted by sort field
		const dbModels = await db.query.aiModels.findMany({
			where: and(
				eq(aiModels.providerId, dbProvider.id),
				eq(aiModels.enabled, 1),
				modelType ? eq(aiModels.type, modelType) : undefined,
			),
			orderBy: (aiModels, { desc }) => [desc(aiModels.sort)],
		});
		
		if (dbModels.length > 0) {
			const serviceModels = dbModels.map(dbModel => dbModelToServiceModel(dbModel));
			const provider = dbProviderToServiceProvider(dbProvider, serviceModels);
			providers.push(provider);
		}
	}

	return providers;
};

export const CreateAiProviderSchema = createInsertSchema(aiProviders).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export type CreateAiProvider = z.infer<typeof CreateAiProviderSchema>;

const createAiProvider = async (req: CreateAiProvider, _ctx: RequestContext) => {
	const { db } = getContext();
	const result = await db.insert(aiProviders).values(req).returning();
	return result[0];
};

export const UpdateAiProviderSchema = createUpdateSchema(aiProviders).omit({
	id: true,
	createdAt: true,
});
export type UpdateAiProvider = z.infer<typeof UpdateAiProviderSchema>;

const updateAiProvider = async (id: string, req: UpdateAiProvider, _ctx: RequestContext) => {
	const { db } = getContext();
	const result = await db.update(aiProviders).set({ ...req, updatedAt: new Date() }).where(eq(aiProviders.id, id)).returning();
	return result[0];
};

export const DeleteAiProviderSchema = z.object({
	id: z.string(),
});
export type DeleteAiProvider = z.infer<typeof DeleteAiProviderSchema>;

const deleteAiProvider = async (req: DeleteAiProvider, _ctx: RequestContext) => {
	const { db } = getContext();
	await db.delete(aiProviders).where(eq(aiProviders.id, req.id));
};

export const CreateAiModelSchema = createInsertSchema(aiModels).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export type CreateAiModel = z.infer<typeof CreateAiModelSchema>;

const createAiModel = async (req: CreateAiModel, _ctx: RequestContext) => {
	const { db } = getContext();
	const result = await db.insert(aiModels).values(req).returning();
	return result[0];
};

export const UpdateAiModelSchema = createUpdateSchema(aiModels).omit({
	id: true,
	createdAt: true,
});
export type UpdateAiModel = z.infer<typeof UpdateAiModelSchema>;

const updateAiModel = async (id: string, req: UpdateAiModel, _ctx: RequestContext) => {
	const { db } = getContext();
	const result = await db.update(aiModels).set({ ...req, updatedAt: new Date() }).where(eq(aiModels.id, id)).returning();
	return result[0];
};

export const DeleteAiModelSchema = z.object({
	id: z.string(),
});
export type DeleteAiModel = z.infer<typeof DeleteAiModelSchema>;

const deleteAiModel = async (req: DeleteAiModel, _ctx: RequestContext) => {
	const { db } = getContext();
	await db.delete(aiModels).where(eq(aiModels.id, req.id));
};

export const BatchUpdateAiModelsEnabledSchema = z.object({
	ids: z.array(z.string()),
	enabled: z.number().int().min(0).max(1),
});
export type BatchUpdateAiModelsEnabled = z.infer<typeof BatchUpdateAiModelsEnabledSchema>;

const batchUpdateAiModelsEnabled = async (req: BatchUpdateAiModelsEnabled, _ctx: RequestContext) => {
	const { db } = getContext();
	await db.update(aiModels).set({ enabled: req.enabled }).where(inArray(aiModels.id, req.ids));
};

class AiService {
	getAiProviders = getAiProviders;
	getEnabledAiProvidersWithModels = getEnabledAiProvidersWithModels;
	createAiProvider = createAiProvider;
	updateAiProvider = updateAiProvider;
	deleteAiProvider = deleteAiProvider;
	createAiModel = createAiModel;
	updateAiModel = updateAiModel;
	deleteAiModel = deleteAiModel;
	batchUpdateAiModelsEnabled = batchUpdateAiModelsEnabled;
}

export const aiService = new AiService();
