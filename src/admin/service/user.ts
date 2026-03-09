import { eq, like, or, and, desc } from "drizzle-orm";
import { getContext } from "./context";
import { user } from "@/admin/db/schemas/auth";

export interface User {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	inviteCode: string | null;
	parentUserId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserListParams {
	page?: number;
	pageSize?: number;
	search?: string;
}

export interface UserListResult {
	users: User[];
	total: number;
	page: number;
	pageSize: number;
}

export const userService = {
	// Get user list with pagination and search
	getUsers: async (params: UserListParams = {}): Promise<{ success: boolean; data?: UserListResult; error?: string }> => {
		const { db } = getContext();
		const { page = 1, pageSize = 20, search } = params;

		try {
			let query = db.select().from(user);

			// Add search filter if provided
			if (search) {
				query = query.where(
					or(
						like(user.name, `%${search}%`),
						like(user.email, `%${search}%`)
					)
				) as typeof query;
			}

			// Get total count
			const countResult = await db
				.select({ count: user.id })
				.from(user)
				.where(
					search
						? or(like(user.name, `%${search}%`), like(user.email, `%${search}%`))
						: undefined
				);
			const total = countResult.length;

			// Get paginated results
			const results = await query
				.orderBy(desc(user.createdAt))
				.limit(pageSize)
				.offset((page - 1) * pageSize);

			const users: User[] = results.map((row) => ({
				id: row.id,
				name: row.name,
				email: row.email,
				emailVerified: row.emailVerified === 1,
				image: row.image,
				inviteCode: row.inviteCode,
				parentUserId: row.parentUserId,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			}));

			return {
				success: true,
				data: {
					users,
					total,
					page,
					pageSize,
				},
			};
		} catch (error) {
			console.error("Get users error:", error);
			return { success: false, error: "Failed to get users" };
		}
	},

	// Get user by ID
	getUserById: async (id: string): Promise<{ success: boolean; user?: User; error?: string }> => {
		const { db } = getContext();

		try {
			const results = await db.select().from(user).where(eq(user.id, id)).limit(1);

			if (results.length === 0) {
				return { success: false, error: "User not found" };
			}

			const row = results[0];
			const userData: User = {
				id: row.id,
				name: row.name,
				email: row.email,
				emailVerified: row.emailVerified === 1,
				image: row.image,
				inviteCode: row.inviteCode,
				parentUserId: row.parentUserId,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			};

			return { success: true, user: userData };
		} catch (error) {
			console.error("Get user error:", error);
			return { success: false, error: "Failed to get user" };
		}
	},

	// Delete user
	deleteUser: async (id: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			// Check if user exists
			const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);

			if (existing.length === 0) {
				return { success: false, error: "User not found" };
			}

			await db.delete(user).where(eq(user.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete user error:", error);
			return { success: false, error: "Failed to delete user" };
		}
	},

	// Delete multiple users
	deleteUsers: async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			for (const id of ids) {
				await db.delete(user).where(eq(user.id, id));
			}

			return { success: true };
		} catch (error) {
			console.error("Delete users error:", error);
			return { success: false, error: "Failed to delete users" };
		}
	},
};
