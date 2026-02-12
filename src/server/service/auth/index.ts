import { hashPassword, verifyPassword } from "@/server/lib/auth";
import { account } from "@/server/db/schemas/auth";
import { eq } from "drizzle-orm";
import { type RequestContext } from "../context";
import { getContext } from "../context";
import { z } from "zod";

export const UpdatePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newPassword: z.string().min(6, "New password must be at least 6 characters").max(72, "New password must be at most 72 characters"),
});

interface UpdatePasswordRequest {
	currentPassword: string;
	newPassword: string;
}

interface UpdatePasswordResult {
	success: boolean;
	error?: string;
	errorCode?: string;
}

const updatePassword = async (req: UpdatePasswordRequest, ctx: RequestContext): Promise<UpdatePasswordResult> => {
	const { db } = getContext();
	const { userId } = ctx;

	try {
		const accounts = await db
			.select()
			.from(account)
			.where(eq(account.userId, userId))
			.limit(1);

		if (accounts.length === 0) {
			return {
				success: false,
				error: "Account not found",
				errorCode: "accountNotFound",
			};
		}

		const userAccount = accounts[0];

		if (!userAccount) {
			return {
				success: false,
				error: "Account not found",
				errorCode: "accountNotFound",
			};
		}

		if (!userAccount.password) {
			return {
				success: false,
				error: "This account uses social login and cannot change password",
				errorCode: "socialLoginCannotChangePassword",
			};
		}

		const isValidPassword = await verifyPassword(userAccount.password, req.currentPassword);

		if (!isValidPassword) {
			return {
				success: false,
				error: "Current password is incorrect",
				errorCode: "currentPasswordIncorrect",
			};
		}

		const hashedNewPassword = await hashPassword(req.newPassword);

		await db
			.update(account)
			.set({ password: hashedNewPassword })
			.where(eq(account.id, userAccount.id));

		return {
			success: true,
		};
	} catch (error: any) {
		console.error("Password update error:", error);
		return {
			success: false,
			error: error.message || "Failed to update password",
		};
	}
};

class AuthService {
	updatePassword = updatePassword;
}

export const authService = new AuthService();
export type AuthServiceType = typeof authService;
export type { UpdatePasswordRequest, UpdatePasswordResult };