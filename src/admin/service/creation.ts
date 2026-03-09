import { eq, and } from "drizzle-orm";
import { getContext } from "./context";
import { creation, type CreationStatus, type CreationType } from "@/admin/db/schemas/admin";

export interface Creation {
	id: string;
	title: string;
	userId: string;
	provider: string;
	model: string;
	type: CreationType;
	prompt: string;
	aspectRatio: string;
	imageCount: number;
	status: CreationStatus;
	resultUrls: string | null;
	errorMessage: string | null;
	deleted: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateCreationRequest {
	title: string;
	provider: string;
	model: string;
	type: CreationType;
	prompt: string;
	aspectRatio?: string;
	imageCount?: number;
	userId: string;
}

export interface UpdateCreationRequest {
	title?: string;
	status?: CreationStatus;
	resultUrls?: string;
	errorMessage?: string;
}

function generateId(): string {
	const chars = "0123456789abcdef";
	let result = "";
	for (let i = 0; i < 32; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

export const creationService = {
	// Get all creations for a user
	getCreations: async (userId: string): Promise<{ success: boolean; creations?: Creation[]; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db
				.select()
				.from(creation)
				.where(and(eq(creation.userId, userId), eq(creation.deleted, 0)))
				.orderBy(creation.createdAt);

			const creations: Creation[] = results.map((row) => ({
				id: row.id,
				title: row.title,
				userId: row.userId,
				provider: row.provider,
				model: row.model,
				type: row.type as CreationType,
				prompt: row.prompt,
				aspectRatio: row.aspectRatio,
				imageCount: row.imageCount,
				status: row.status as CreationStatus,
				resultUrls: row.resultUrls,
				errorMessage: row.errorMessage,
				deleted: row.deleted,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			}));

			return { success: true, creations };
		} catch (error) {
			console.error("Get creations error:", error);
			return { success: false, error: "Failed to get creations" };
		}
	},

	// Get creation by ID
	getCreationById: async (id: string, userId: string): Promise<{ success: boolean; creation?: Creation; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db
				.select()
				.from(creation)
				.where(and(eq(creation.id, id), eq(creation.userId, userId), eq(creation.deleted, 0)))
				.limit(1);

			if (results.length === 0) {
				return { success: false, error: "Creation not found" };
			}

			const row = results[0];
			const creationData: Creation = {
				id: row.id,
				title: row.title,
				userId: row.userId,
				provider: row.provider,
				model: row.model,
				type: row.type as CreationType,
				prompt: row.prompt,
				aspectRatio: row.aspectRatio,
				imageCount: row.imageCount,
				status: row.status as CreationStatus,
				resultUrls: row.resultUrls,
				errorMessage: row.errorMessage,
				deleted: row.deleted,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			};

			return { success: true, creation: creationData };
		} catch (error) {
			console.error("Get creation error:", error);
			return { success: false, error: "Failed to get creation" };
		}
	},

	// Create new creation
	createCreation: async (data: CreateCreationRequest): Promise<{ success: boolean; id?: string; error?: string }> => {
		const { db } = getContext();

		try {
			const id = generateId();
			const now = new Date();

			await db.insert(creation).values({
				id,
				title: data.title,
				userId: data.userId,
				provider: data.provider,
				model: data.model,
				type: data.type,
				prompt: data.prompt,
				aspectRatio: data.aspectRatio || "1:1",
				imageCount: data.imageCount || 1,
				status: "pending",
				resultUrls: null,
				errorMessage: null,
				deleted: 0,
				createdAt: now,
				updatedAt: now,
			});

			return { success: true, id };
		} catch (error) {
			console.error("Create creation error:", error);
			return { success: false, error: "Failed to create creation" };
		}
	},

	// Update creation
	updateCreation: async (
		id: string,
		userId: string,
		data: UpdateCreationRequest
	): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			// Check if creation exists and belongs to user
			const existing = await db
				.select()
				.from(creation)
				.where(and(eq(creation.id, id), eq(creation.userId, userId), eq(creation.deleted, 0)))
				.limit(1);

			if (existing.length === 0) {
				return { success: false, error: "Creation not found" };
			}

			const updateData: Partial<typeof creation.$inferInsert> = {
				updatedAt: new Date(),
			};

			if (data.title !== undefined) updateData.title = data.title;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.resultUrls !== undefined) updateData.resultUrls = data.resultUrls;
			if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;

			await db.update(creation).set(updateData).where(eq(creation.id, id));

			return { success: true };
		} catch (error) {
			console.error("Update creation error:", error);
			return { success: false, error: "Failed to update creation" };
		}
	},

	// Delete creation (soft delete)
	deleteCreation: async (id: string, userId: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			// Check if creation exists and belongs to user
			const existing = await db
				.select()
				.from(creation)
				.where(and(eq(creation.id, id), eq(creation.userId, userId), eq(creation.deleted, 0)))
				.limit(1);

			if (existing.length === 0) {
				return { success: false, error: "Creation not found" };
			}

			await db
				.update(creation)
				.set({ deleted: 1, updatedAt: new Date() })
				.where(eq(creation.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete creation error:", error);
			return { success: false, error: "Failed to delete creation" };
		}
	},
};
