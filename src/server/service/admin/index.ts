import { admin, adminLoginLog, user, account, session } from "@/server/db/schemas";
import { eq, and } from "drizzle-orm";
import { getContext } from "../context";
import { hashPassword, verifyPassword } from "@/server/lib/auth";
import { z } from "zod";
import { randomBytes } from "node:crypto";

export const AdminLoginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const CreateAdminSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be at most 72 characters"),
	name: z.string().min(1, "Name is required"),
	department: z.string().optional(),
	permissions: z.array(z.string()).optional(),
});

interface AdminLoginRequest {
	email: string;
	password: string;
}

interface AdminLoginResult {
	success: boolean;
	error?: string;
	errorCode?: string;
	token?: string;
	admin?: {
		id: string;
		userId: string;
		name: string;
		email: string;
		department?: string | null;
		permissions?: string[] | null;
		status: string;
	};
}

interface CreateAdminRequest {
	email: string;
	password: string;
	name: string;
	department?: string;
	permissions?: string[];
}

interface CreateAdminResult {
	success: boolean;
	error?: string;
	errorCode?: string;
	adminId?: string;
}

interface VerifyTokenResult {
	success: boolean;
	admin?: {
		id: string;
		userId: string;
		name: string;
		email: string;
		department?: string | null;
		permissions?: string[] | null;
		status: string;
	};
}

const generateId = (): string => {
	return randomBytes(16).toString("hex");
};

const adminLogin = async (req: AdminLoginRequest, clientInfo?: { ip?: string; userAgent?: string }): Promise<AdminLoginResult> => {
	const { db } = getContext();

	try {
		const users = await db
			.select()
			.from(user)
			.where(and(eq(user.email, req.email), eq(user.role, "admin")))
			.limit(1);

		if (users.length === 0) {
			await logLoginAttempt(db, null, clientInfo, "failed", "Admin not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const adminUser = users[0];

		if (!adminUser) {
			await logLoginAttempt(db, null, clientInfo, "failed", "Admin not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const accounts = await db
			.select()
			.from(account)
			.where(eq(account.userId, adminUser.id))
			.limit(1);

		if (accounts.length === 0 || !accounts[0]?.password) {
			await logLoginAttempt(db, adminUser.id, clientInfo, "failed", "Account not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const userAccount = accounts[0];
		const isValidPassword = await verifyPassword(userAccount.password, req.password);

		if (!isValidPassword) {
			await logLoginAttempt(db, adminUser.id, clientInfo, "failed", "Invalid password");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const admins = await db
			.select()
			.from(admin)
			.where(eq(admin.userId, adminUser.id))
			.limit(1);

		if (admins.length === 0) {
			await logLoginAttempt(db, adminUser.id, clientInfo, "failed", "Admin record not found");
			return {
				success: false,
				error: "Admin record not found",
				errorCode: "adminNotFound",
			};
		}

		const adminRecord = admins[0];

		if (!adminRecord) {
			await logLoginAttempt(db, adminUser.id, clientInfo, "failed", "Admin record not found");
			return {
				success: false,
				error: "Admin record not found",
				errorCode: "adminNotFound",
			};
		}

		if (adminRecord.status !== "active") {
			await logLoginAttempt(db, adminUser.id, clientInfo, "failed", `Admin account is ${adminRecord.status}`);
			return {
				success: false,
				error: `Admin account is ${adminRecord.status}`,
				errorCode: "accountInactive",
			};
		}

		await db
			.update(admin)
			.set({
				lastLoginAt: new Date(),
				lastLoginIp: clientInfo?.ip,
				updatedAt: new Date(),
			})
			.where(eq(admin.id, adminRecord.id));

		await logLoginAttempt(db, adminUser.id, clientInfo, "success");

		const token = generateId();
		const sessionId = generateId();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

		await db.insert(session).values({
			id: sessionId,
			expiresAt: expiresAt,
			token: token,
			createdAt: new Date(),
			updatedAt: new Date(),
			ipAddress: clientInfo?.ip,
			userAgent: clientInfo?.userAgent,
			userId: adminUser.id,
		});

		return {
			success: true,
			token,
			admin: {
				id: adminRecord.id,
				userId: adminUser.id,
				name: adminUser.name,
				email: adminUser.email,
				department: adminRecord.department,
				permissions: adminRecord.permissions,
				status: adminRecord.status,
			},
		};
	} catch (error: any) {
		console.error("Admin login error:", error);
		return {
			success: false,
			error: error.message || "Failed to login",
		};
	}
};

const logLoginAttempt = async (
	db: any,
	adminId: string | null,
	clientInfo: { ip?: string; userAgent?: string } | undefined,
	status: string,
	failureReason?: string
) => {
	try {
		await db.insert(adminLoginLog).values({
			id: generateId(),
			adminId: adminId || "unknown",
			loginAt: new Date(),
			loginIp: clientInfo?.ip,
			userAgent: clientInfo?.userAgent,
			status,
			failureReason,
			createdAt: new Date(),
		});
	} catch (error) {
		console.error("Failed to log login attempt:", error);
	}
};

const createAdmin = async (req: CreateAdminRequest): Promise<CreateAdminResult> => {
	const { db } = getContext();

	try {
		const existingUsers = await db
			.select()
			.from(user)
			.where(eq(user.email, req.email))
			.limit(1);

		if (existingUsers.length > 0) {
			return {
				success: false,
				error: "Email already exists",
				errorCode: "emailExists",
			};
		}

		const userId = generateId();
		const adminId = generateId();
		const accountId = generateId();
		const hashedPassword = await hashPassword(req.password);

		await db.insert(user).values({
			id: userId,
			name: req.name,
			email: req.email,
			role: "admin",
			emailVerified: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await db.insert(account).values({
			id: accountId,
			accountId: userId,
			providerId: "credential",
			userId: userId,
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await db.insert(admin).values({
			id: adminId,
			userId: userId,
			department: req.department,
			permissions: req.permissions || [],
			status: "active",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return {
			success: true,
			adminId,
		};
	} catch (error: any) {
		console.error("Create admin error:", error);
		return {
			success: false,
			error: error.message || "Failed to create admin",
		};
	}
};

const verifyToken = async (token: string): Promise<VerifyTokenResult> => {
	const { db } = getContext();

	try {
		const sessions = await db
			.select()
			.from(session)
			.where(eq(session.token, token))
			.limit(1);

		if (sessions.length === 0) {
			return {
				success: false,
			};
		}

		const sessionRecord = sessions[0];

		if (!sessionRecord) {
			return {
				success: false,
			};
		}

		if (new Date() > sessionRecord.expiresAt) {
			await db.delete(session).where(eq(session.id, sessionRecord.id));
			return {
				success: false,
			};
		}

		const users = await db
			.select()
			.from(user)
			.where(eq(user.id, sessionRecord.userId))
			.limit(1);

		if (users.length === 0) {
			return {
				success: false,
			};
		}

		const adminUser = users[0];

		if (!adminUser || adminUser.role !== "admin") {
			return {
				success: false,
			};
		}

		const admins = await db
			.select()
			.from(admin)
			.where(eq(admin.userId, adminUser.id))
			.limit(1);

		if (admins.length === 0) {
			return {
				success: false,
			};
		}

		const adminRecord = admins[0];

		if (!adminRecord || adminRecord.status !== "active") {
			return {
				success: false,
			};
		}

		return {
			success: true,
			admin: {
				id: adminRecord.id,
				userId: adminUser.id,
				name: adminUser.name,
				email: adminUser.email,
				department: adminRecord.department,
				permissions: adminRecord.permissions,
				status: adminRecord.status,
			},
		};
	} catch (error: any) {
		console.error("Verify token error:", error);
		return {
			success: false,
		};
	}
};

const logout = async (token: string): Promise<{ success: boolean }> => {
	const { db } = getContext();

	try {
		await db.delete(session).where(eq(session.token, token));
		return {
			success: true,
		};
	} catch (error: any) {
		console.error("Logout error:", error);
		return {
			success: false,
		};
	}
};

class AdminService {
	login = adminLogin;
	createAdmin = createAdmin;
	verifyToken = verifyToken;
	logout = logout;
}

export const adminService = new AdminService();
export type AdminServiceType = typeof adminService;
export type { AdminLoginRequest, AdminLoginResult, CreateAdminRequest, CreateAdminResult };
