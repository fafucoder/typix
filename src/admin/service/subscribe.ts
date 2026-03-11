import { eq, like, or, desc, sql, isNull, and } from "drizzle-orm";
import { subscribe } from "@/admin/db/schemas/admin";
import { getContext } from "./context";

export interface Subscribe {
	id: string;
	name: string;
	description: string | null;
	type: "subscription" | "credits";
	price: number;
	originalPrice: number | null;
	credits: number;
	duration: number;
	sortOrder: number;
	isPopular: number;
	status: "active" | "inactive" | "deleted";
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export interface SubscribeListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: string;
}

export interface SubscribeListResult {
	subscribes: Subscribe[];
	total: number;
	page: number;
	pageSize: number;
}

export interface CreateSubscribeData {
	name: string;
	description?: string;
	type: "subscription" | "credits";
	price: number;
	originalPrice?: number;
	credits: number;
	duration: number;
	sortOrder?: number;
	isPopular?: number;
	status?: "active" | "inactive";
}

export interface UpdateSubscribeData {
	name?: string;
	description?: string;
	type?: "subscription" | "credits";
	price?: number;
	originalPrice?: number;
	credits?: number;
	duration?: number;
	sortOrder?: number;
	isPopular?: number;
	status?: "active" | "inactive";
}

export const subscribeService = {
	// Get subscribe list with pagination and search
	getSubscribes: async (params: SubscribeListParams = {}): Promise<{ success: boolean; data?: SubscribeListResult; error?: string }> => {
		const { db } = getContext();
		const { page = 1, pageSize = 20, search, status } = params;

		try {
			// Base condition: not soft deleted
			let baseCondition = isNull(subscribe.deletedAt);

			// Build search conditions
			if (search) {
				baseCondition = and(
					baseCondition,
					or(
						like(subscribe.name, `%${search}%`),
						like(subscribe.description || "", `%${search}%`)
					)
				) as typeof baseCondition;
			}

			// Add status filter
			if (status && status !== "all") {
				baseCondition = and(
					baseCondition,
					eq(subscribe.status, status as "active" | "inactive" | "deleted")
				) as typeof baseCondition;
			}

			let query = db.select().from(subscribe).where(baseCondition);

			// Get total count
			const countResult = await db
				.select({ count: sql<number>`count(*)` })
				.from(subscribe)
				.where(baseCondition);
			const total = countResult[0]?.count || 0;

			// Get paginated results
			const results = await query
				.orderBy(desc(subscribe.sortOrder), desc(subscribe.createdAt))
				.limit(pageSize)
				.offset((page - 1) * pageSize);

			return {
				success: true,
				data: {
					subscribes: results as unknown as Subscribe[],
					total,
					page,
					pageSize,
				},
			};
		} catch (error) {
			console.error("Get subscribes error:", error);
			return { success: false, error: "Failed to get subscribes" };
		}
	},

	// Get subscribe by ID
	getSubscribeById: async (id: string): Promise<{ success: boolean; subscribe?: Subscribe; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db
				.select()
				.from(subscribe)
				.where(and(eq(subscribe.id, id), isNull(subscribe.deletedAt)))
				.limit(1);

			if (results.length === 0) {
				return { success: false, error: "Subscribe not found" };
			}

			return { success: true, subscribe: results[0] as unknown as Subscribe };
		} catch (error) {
			console.error("Get subscribe by id error:", error);
			return { success: false, error: "Failed to get subscribe" };
		}
	},

	// Create subscribe
	createSubscribe: async (data: CreateSubscribeData): Promise<{ success: boolean; subscribe?: Subscribe; error?: string }> => {
		const { db } = getContext();

		try {
			const id = crypto.randomUUID();
			const now = new Date();

			await db.insert(subscribe).values({
				id,
				name: data.name,
				description: data.description || null,
				type: data.type,
				price: data.price,
				originalPrice: data.originalPrice || null,
				credits: data.credits,
				duration: data.duration,
				sortOrder: data.sortOrder || 0,
				isPopular: data.isPopular || 0,
				status: data.status || "active",
				createdAt: now,
				updatedAt: now,
			});

			const result = await subscribeService.getSubscribeById(id);
			if (!result.success) {
				return { success: false, error: "Failed to get created subscribe" };
			}

			return { success: true, subscribe: result.subscribe };
		} catch (error) {
			console.error("Create subscribe error:", error);
			return { success: false, error: "Failed to create subscribe" };
		}
	},

	// Update subscribe
	updateSubscribe: async (id: string, data: UpdateSubscribeData): Promise<{ success: boolean; subscribe?: Subscribe; error?: string }> => {
		const { db } = getContext();

		try {
			const updateData: Partial<typeof subscribe.$inferInsert> = {
				updatedAt: new Date(),
			};

			if (data.name !== undefined) updateData.name = data.name;
			if (data.description !== undefined) updateData.description = data.description || null;
			if (data.type !== undefined) updateData.type = data.type;
			if (data.price !== undefined) updateData.price = data.price;
			if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice || null;
			if (data.credits !== undefined) updateData.credits = data.credits;
			if (data.duration !== undefined) updateData.duration = data.duration;
			if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
			if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
			if (data.status !== undefined) updateData.status = data.status;

			await db
				.update(subscribe)
				.set(updateData)
				.where(eq(subscribe.id, id));

			const result = await subscribeService.getSubscribeById(id);
			if (!result.success) {
				return { success: false, error: "Subscribe not found after update" };
			}

			return { success: true, subscribe: result.subscribe };
		} catch (error) {
			console.error("Update subscribe error:", error);
			return { success: false, error: "Failed to update subscribe" };
		}
	},

	// Delete subscribe (soft delete)
	deleteSubscribe: async (id: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			await db
				.update(subscribe)
				.set({
					status: "deleted",
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(subscribe.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete subscribe error:", error);
			return { success: false, error: "Failed to delete subscribe" };
		}
	},

	// Delete multiple subscribes (soft delete)
	deleteSubscribes: async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			for (const id of ids) {
				await db
					.update(subscribe)
					.set({
						status: "deleted",
						deletedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(subscribe.id, id));
			}

			return { success: true };
		} catch (error) {
			console.error("Delete subscribes error:", error);
			return { success: false, error: "Failed to delete subscribes" };
		}
	},
};
