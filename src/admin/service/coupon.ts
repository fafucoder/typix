import { eq, like, or, desc, and, gte, lte } from "drizzle-orm";
import { coupon } from "@/admin/db/schemas/admin";
import { getContext } from "./context";

export interface Coupon {
	id: string;
	code: string;
	name: string;
	description: string | null;
	type: "percentage" | "fixed_amount";
	value: number;
	minOrderAmount: number;
	maxDiscountAmount: number | null;
	usageLimit: number;
	usageCount: number;
	perUserLimit: number;
	subscribeIds: string[];
	startAt: string | null;
	endAt: string | null;
	status: "active" | "inactive" | "expired" | "deleted";
	createdAt: string;
	updatedAt: string;
}

export interface CouponListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: string;
}

export interface CouponListResult {
	coupons: Coupon[];
	total: number;
	page: number;
	pageSize: number;
}

export interface CreateCouponData {
	code: string;
	name: string;
	description?: string;
	type: "percentage" | "fixed_amount";
	value: number;
	minOrderAmount?: number;
	maxDiscountAmount?: number;
	usageLimit?: number;
	perUserLimit?: number;
	subscribeIds?: string[];
	startAt?: string;
	endAt?: string;
	status?: "active" | "inactive";
}

export interface UpdateCouponData {
	code?: string;
	name?: string;
	description?: string;
	type?: "percentage" | "fixed_amount";
	value?: number;
	minOrderAmount?: number;
	maxDiscountAmount?: number;
	usageLimit?: number;
	perUserLimit?: number;
	subscribeIds?: string[];
	startAt?: string;
	endAt?: string;
	status?: "active" | "inactive";
}

export const couponService = {
	// Get coupon list with pagination and search
	getCoupons: async (params: CouponListParams = {}): Promise<{ success: boolean; data?: CouponListResult; error?: string }> => {
		const { db } = getContext();
		const { page = 1, pageSize = 20, search, status } = params;

		try {
			let query = db.select().from(coupon);

			// Build search conditions
			if (search) {
				query = query.where(
					or(
						like(coupon.code, `%${search}%`),
						like(coupon.name, `%${search}%`),
						like(coupon.description || "", `%${search}%`)
					)
				) as typeof query;
			}

			// Add status filter
			if (status && status !== "all") {
				query = query.where(eq(coupon.status, status as "active" | "inactive" | "expired" | "deleted")) as typeof query;
			}

			// Get total count
			const countQuery = db.select({ count: coupon.id }).from(coupon);
			let countResult;
			if (search) {
				countResult = await countQuery.where(
					or(
						like(coupon.code, `%${search}%`),
						like(coupon.name, `%${search}%`),
						like(coupon.description || "", `%${search}%`)
					)
				);
			} else if (status && status !== "all") {
				countResult = await countQuery.where(eq(coupon.status, status as "active" | "inactive" | "expired" | "deleted"));
			} else {
				countResult = await countQuery;
			}
			const total = countResult.length;

			// Get paginated results
			const results = await query
				.orderBy(desc(coupon.createdAt))
				.limit(pageSize)
				.offset((page - 1) * pageSize);

			const coupons: Coupon[] = results.map((row) => ({
				id: row.id,
				code: row.code,
				name: row.name,
				description: row.description,
				type: row.type,
				value: row.value,
				minOrderAmount: row.minOrderAmount,
				maxDiscountAmount: row.maxDiscountAmount,
				usageLimit: row.usageLimit,
				usageCount: row.usageCount,
				perUserLimit: row.perUserLimit,
				subscribeIds: (row.subscribeIds as string[]) || [],
				startAt: row.startAt?.toISOString() || null,
				endAt: row.endAt?.toISOString() || null,
				status: row.status,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			}));

			return {
				success: true,
				data: {
					coupons,
					total,
					page,
					pageSize,
				},
			};
		} catch (error) {
			console.error("Get coupons error:", error);
			return { success: false, error: "Failed to get coupons" };
		}
	},

	// Get coupon by ID
	getCouponById: async (id: string): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db
				.select()
				.from(coupon)
				.where(eq(coupon.id, id))
				.limit(1);

			if (results.length === 0) {
				return { success: false, error: "Coupon not found" };
			}

			const row = results[0];
			return {
				success: true,
				coupon: {
					id: row.id,
					code: row.code,
					name: row.name,
					description: row.description,
					type: row.type,
					value: row.value,
					minOrderAmount: row.minOrderAmount,
					maxDiscountAmount: row.maxDiscountAmount,
					usageLimit: row.usageLimit,
					usageCount: row.usageCount,
					perUserLimit: row.perUserLimit,
					subscribeIds: (row.subscribeIds as string[]) || [],
					startAt: row.startAt?.toISOString() || null,
					endAt: row.endAt?.toISOString() || null,
					status: row.status,
					createdAt: row.createdAt.toISOString(),
					updatedAt: row.updatedAt.toISOString(),
				},
			};
		} catch (error) {
			console.error("Get coupon by id error:", error);
			return { success: false, error: "Failed to get coupon" };
		}
	},

	// Generate random coupon code (6 characters: A-Z, 0-9)
	generateCouponCode(): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let code = "";
		for (let i = 0; i < 6; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return code;
	},

	// Create coupon
	createCoupon: async (data: CreateCouponData): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
		const { db } = getContext();

		try {
			const id = crypto.randomUUID();
			const now = new Date();

			// Auto-generate code if not provided
			let code = data.code;
			if (!code || code.trim() === "") {
				code = couponService.generateCouponCode();
			}

			await db.insert(coupon).values({
				id,
				code: code.toUpperCase(),
				name: data.name,
				description: data.description || null,
				type: data.type,
				value: data.value,
				minOrderAmount: data.minOrderAmount || 0,
				maxDiscountAmount: data.maxDiscountAmount || null,
				usageLimit: data.usageLimit || 0,
				usageCount: 0,
				perUserLimit: data.perUserLimit || 1,
				subscribeIds: data.subscribeIds || [],
				startAt: data.startAt ? new Date(data.startAt) : null,
				endAt: data.endAt ? new Date(data.endAt) : null,
				status: data.status || "active",
				createdAt: now,
				updatedAt: now,
			});

			const result = await couponService.getCouponById(id);
			if (!result.success) {
				return { success: false, error: "Failed to get created coupon" };
			}

			return { success: true, coupon: result.coupon };
		} catch (error) {
			console.error("Create coupon error:", error);
			return { success: false, error: "Failed to create coupon" };
		}
	},

	// Update coupon
	updateCoupon: async (id: string, data: UpdateCouponData): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
		const { db } = getContext();

		try {
			const updateData: Partial<typeof coupon.$inferInsert> = {
				updatedAt: new Date(),
			};

			if (data.code !== undefined) updateData.code = data.code;
			if (data.name !== undefined) updateData.name = data.name;
			if (data.description !== undefined) updateData.description = data.description || null;
			if (data.type !== undefined) updateData.type = data.type;
			if (data.value !== undefined) updateData.value = data.value;
			if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
			if (data.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = data.maxDiscountAmount || null;
			if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
			if (data.perUserLimit !== undefined) updateData.perUserLimit = data.perUserLimit;
			if (data.subscribeIds !== undefined) updateData.subscribeIds = data.subscribeIds;
			if (data.startAt !== undefined) updateData.startAt = data.startAt ? new Date(data.startAt) : null;
			if (data.endAt !== undefined) updateData.endAt = data.endAt ? new Date(data.endAt) : null;
			if (data.status !== undefined) updateData.status = data.status;

			await db
				.update(coupon)
				.set(updateData)
				.where(eq(coupon.id, id));

			const result = await couponService.getCouponById(id);
			if (!result.success) {
				return { success: false, error: "Coupon not found after update" };
			}

			return { success: true, coupon: result.coupon };
		} catch (error) {
			console.error("Update coupon error:", error);
			return { success: false, error: "Failed to update coupon" };
		}
	},

	// Delete coupon (soft delete)
	deleteCoupon: async (id: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			await db
				.update(coupon)
				.set({ status: "deleted", updatedAt: new Date() })
				.where(eq(coupon.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete coupon error:", error);
			return { success: false, error: "Failed to delete coupon" };
		}
	},

	// Delete multiple coupons (soft delete)
	deleteCoupons: async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			for (const id of ids) {
				await db
					.update(coupon)
					.set({ status: "deleted", updatedAt: new Date() })
					.where(eq(coupon.id, id));
			}

			return { success: true };
		} catch (error) {
			console.error("Delete coupons error:", error);
			return { success: false, error: "Failed to delete coupons" };
		}
	},
};
