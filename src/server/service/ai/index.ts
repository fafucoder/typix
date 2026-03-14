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
	sort: number;
	createdAt: Date;
	updatedAt: Date;
	ability: string;
	supportedAspectRatios: string[];
}

// Convert database model to service model format
const dbModelToServiceModel = (dbModel: DbAiModel): AiModel => {
	let supportedAspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
	
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
	
	return {
		id: dbModel.modelId,
		name: dbModel.name || dbModel.modelId,
		ability: dbModel.ability as Ability,
		maxInputImages: dbModel.maxInputImages ?? 1,
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

export const GetAiProviderByIdSchema = z.object({
	providerId: z.string(),
});
export type GetAiProviderById = z.infer<typeof GetAiProviderByIdSchema>;

const getAiProviderById = async (req: GetAiProviderById, _ctx: RequestContext) => {
	const { db } = getContext();

	// Get provider from database
	const dbProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!dbProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Get models for this provider sorted by sort field
	const dbModels = await db.query.aiModels.findMany({
		where: eq(aiModels.providerId, dbProvider.id),
		orderBy: (aiModels, { desc }) => [desc(aiModels.sort)],
	});
	const serviceModels = dbModels.map(dbModel => dbModelToServiceModel(dbModel));

	return dbProviderToServiceProvider(dbProvider, serviceModels);
};

export const GetAiProviderWithDbDataSchema = z.object({
	providerId: z.string(),
});
export type GetAiProviderWithDbData = z.infer<typeof GetAiProviderWithDbDataSchema>;

const getAiProviderWithDbData = async (req: GetAiProviderWithDbData, _ctx: RequestContext) => {
	const { db } = getContext();

	// Get provider from database
	const dbProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!dbProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Get models for this provider sorted by sort field
	const dbModels = await db.query.aiModels.findMany({
		where: eq(aiModels.providerId, dbProvider.id),
		orderBy: (aiModels, { desc }) => [desc(aiModels.sort)],
	});

	return { dbProvider, dbModels };
};

export const GetAiProviderAndModelByIdSchema = z.object({
	providerId: z.string(),
	modelId: z.string(),
});
export type GetAiProviderAndModelById = z.infer<typeof GetAiProviderAndModelByIdSchema>;

const getAiProviderAndModelById = async (req: GetAiProviderAndModelById, _ctx: RequestContext) => {
	const { db } = getContext();

	// Get provider from database
	const dbProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!dbProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Get specific model for this provider
	const dbModel = await db.query.aiModels.findFirst({
		where: and(
			eq(aiModels.providerId, dbProvider.id),
			eq(aiModels.modelId, req.modelId)
		),
	});

	return { dbProvider, dbModel };
};

export const UpdateAiProviderSchema = createUpdateSchema(aiProviders).pick({
	providerId: true,
	enabled: true,
	settings: true,
});
export type UpdateAiProvider = z.infer<typeof UpdateAiProviderSchema>;

const updateAiProvider = async (req: UpdateAiProvider, _ctx: RequestContext) => {
	const { db } = getContext();

	if (!req.providerId) {
		throw new ServiceException("invalid_parameter", "Provider ID is required");
	}

	// Get existing provider from database
	const existingProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!existingProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Update provider in database
	await db
		.update(aiProviders)
		.set({
			enabled: req.enabled,
			settings: req.settings ? JSON.stringify(req.settings) : null,
			updatedAt: new Date(),
		})
		.where(eq(aiProviders.id, existingProvider.id));
};

export const GetAiModelsByProviderIdSchema = z.object({
	providerId: z.string(),
});
export type GetAiModelsByProviderId = z.infer<typeof GetAiModelsByProviderIdSchema>;

const getAiModelsByProviderId = async (req: GetAiModelsByProviderId, _ctx: RequestContext) => {
	const { db } = getContext();

	// Get provider from database
	const dbProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!dbProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Get models from database sorted by sort field
	const dbModels = await db.query.aiModels.findMany({
		where: eq(aiModels.providerId, dbProvider.id),
		orderBy: (aiModels, { desc }) => [desc(aiModels.sort)],
	});

	return dbModels.map(dbModel => dbModelToServiceModel(dbModel, dbProvider.providerId));
};

export const UpdateAiModelSchema = createInsertSchema(aiModels).pick({
	providerId: true,
	modelId: true,
	enabled: true,
});
export type UpdateAiModel = z.infer<typeof UpdateAiModelSchema>;

const updateAiModel = async (req: UpdateAiModel, _ctx: RequestContext) => {
	const { db } = getContext();

	// Get provider from database
	const dbProvider = await db.query.aiProviders.findFirst({
		where: eq(aiProviders.providerId, req.providerId),
	});

	if (!dbProvider) {
		throw new ServiceException("not_found", "AI provider not found in database");
	}

	// Get existing model from database
	const existingModel = await db.query.aiModels.findFirst({
		where: and(
			eq(aiModels.providerId, dbProvider.id),
			eq(aiModels.modelId, req.modelId),
		),
	});

	if (!existingModel) {
		throw new ServiceException("not_found", "AI model not found in database");
	}

	// Update model in database
	await db
		.update(aiModels)
		.set({
			enabled: req.enabled,
			updatedAt: new Date(),
		})
		.where(eq(aiModels.id, existingModel.id));
};

export const aiService = {
	getAiProviders,
	getEnabledAiProvidersWithModels,
	getAiProviderById,
	getAiProviderWithDbData,
	getAiProviderAndModelById,
	updateAiProvider,
	getAiModelsByProviderId,
	updateAiModel,
};
