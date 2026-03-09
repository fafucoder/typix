import { admin, adminSession, adminAccount, adminLoginLog } from "@/admin/db/schemas/admin";
import { eq } from "drizzle-orm";
import { getContext } from "@/admin/service/context";
import { hashPassword, verifyPassword } from "@/admin/lib/auth";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const AdminLoginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const CreateAdminSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be at most 72 characters"),
	name: z.string().min(1, "Name is required"),
	role: z.enum(["super_admin", "admin", "editor"]).optional(),
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
		name: string;
		email: string;
		role: string;
		department?: string | null;
		permissions?: string[] | null;
		status: string;
		image?: string | null;
	};
}

interface CreateAdminRequest {
	email: string;
	password: string;
	name: string;
	role?: "super_admin" | "admin" | "editor";
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
		name: string;
		email: string;
		role: string;
		department?: string | null;
		permissions?: string[] | null;
		status: string;
		image?: string | null;
	};
}

const generateId = (): string => {
	return randomBytes(16).toString("hex");
};

const adminLogin = async (req: AdminLoginRequest, clientInfo?: { ip?: string; userAgent?: string }): Promise<AdminLoginResult> => {
	const { db } = getContext();

	try {
		const admins = await db
			.select()
			.from(admin)
			.where(eq(admin.email, req.email))
			.limit(1);

		if (admins.length === 0) {
			await logLoginAttempt(db, null, clientInfo, "failed", "Admin not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const adminRecord = admins[0];

		if (!adminRecord) {
			await logLoginAttempt(db, null, clientInfo, "failed", "Admin not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		if (adminRecord.status !== "active") {
			await logLoginAttempt(db, adminRecord.id, clientInfo, "failed", `Admin account is ${adminRecord.status}`);
			return {
				success: false,
				error: `Admin account is ${adminRecord.status}`,
				errorCode: "accountInactive",
			};
		}

		const accounts = await db
			.select()
			.from(adminAccount)
			.where(eq(adminAccount.userId, adminRecord.id))
			.limit(1);

		if (accounts.length === 0 || !accounts[0]?.password) {
			await logLoginAttempt(db, adminRecord.id, clientInfo, "failed", "Account not found");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		const adminAcc = accounts[0];
		const isValidPassword = await verifyPassword(adminAcc.password, req.password);

		if (!isValidPassword) {
			await logLoginAttempt(db, adminRecord.id, clientInfo, "failed", "Invalid password");
			return {
				success: false,
				error: "Invalid email or password",
				errorCode: "invalidCredentials",
			};
		}

		await db
			.update(admin)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(admin.id, adminRecord.id));

		await logLoginAttempt(db, adminRecord.id, clientInfo, "success");

		const token = generateId();
		const sessionId = generateId();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

		await db.insert(adminSession).values({
			id: sessionId,
			expiresAt: expiresAt,
			token: token,
			createdAt: new Date(),
			updatedAt: new Date(),
			ipAddress: clientInfo?.ip,
			userAgent: clientInfo?.userAgent,
			userId: adminRecord.id,
		});

		return {
			success: true,
			token,
			admin: {
				id: adminRecord.id,
				name: adminRecord.name,
				email: adminRecord.email,
				role: adminRecord.role,
				department: adminRecord.department,
				permissions: adminRecord.permissions,
				status: adminRecord.status,
				image: adminRecord.image,
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
		const existingAdmins = await db
			.select()
			.from(admin)
			.where(eq(admin.email, req.email))
			.limit(1);

		if (existingAdmins.length > 0) {
			return {
				success: false,
				error: "Email already exists",
				errorCode: "emailExists",
			};
		}

		const adminId = generateId();
		const accountId = generateId();
		const hashedPassword = await hashPassword(req.password);

		await db.insert(admin).values({
			id: adminId,
			name: req.name,
			email: req.email,
			role: req.role || "admin",
			department: req.department,
			permissions: req.permissions || [],
			status: "active",
			emailVerified: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await db.insert(adminAccount).values({
			id: accountId,
			accountId: adminId,
			providerId: "credential",
			userId: adminId,
			password: hashedPassword,
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
			.from(adminSession)
			.where(eq(adminSession.token, token))
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
			await db.delete(adminSession).where(eq(adminSession.id, sessionRecord.id));
			return {
				success: false,
			};
		}

		const admins = await db
			.select()
			.from(admin)
			.where(eq(admin.id, sessionRecord.userId))
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
				name: adminRecord.name,
				email: adminRecord.email,
				role: adminRecord.role,
				department: adminRecord.department,
				permissions: adminRecord.permissions,
				status: adminRecord.status,
				image: adminRecord.image,
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
		await db.delete(adminSession).where(eq(adminSession.token, token));
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

const updateAdmin = async (adminId: string, data: { name?: string; department?: string; image?: string }): Promise<{ success: boolean; error?: string }> => {
	const { db } = getContext();

	try {
		const updateData: { name?: string; department?: string; image?: string; updatedAt: Date } = {
			updatedAt: new Date(),
		};
		
		if (data.name !== undefined) {
			updateData.name = data.name;
		}
		if (data.department !== undefined) {
			updateData.department = data.department;
		}
		if (data.image !== undefined) {
			updateData.image = data.image;
		}

		await db
			.update(admin)
			.set(updateData)
			.where(eq(admin.id, adminId));

		return {
			success: true,
		};
	} catch (error: any) {
		console.error("Update admin error:", error);
		return {
			success: false,
			error: error.message || "Failed to update admin",
		};
	}
};

// 上传头像 - 保存文件到服务器，返回路径
const uploadAvatar = async (adminId: string, base64Image: string): Promise<{ success: boolean; imagePath?: string; error?: string }> => {
	try {
		// 验证 base64 图片数据
		if (!base64Image.startsWith("data:image/")) {
			return {
				success: false,
				error: "Invalid image format",
			};
		}

		// 解析 base64 数据
		const matches = base64Image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
		if (!matches) {
			return {
				success: false,
				error: "Invalid base64 image data",
			};
		}

		const ext = matches[1];
		const base64Data = matches[2];
		const buffer = Buffer.from(base64Data, "base64");

		// 验证文件大小 (最大 2MB)
		if (buffer.length > 2 * 1024 * 1024) {
			return {
				success: false,
				error: "File size exceeds 2MB limit",
			};
		}

		// 创建上传目录
		const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		// 生成文件名
		const fileName = `${adminId}_${Date.now()}.${ext}`;
		const filePath = path.join(uploadDir, fileName);

		// 保存文件
		await writeFile(filePath, buffer);

		// 返回相对路径
		const imagePath = `/uploads/avatars/${fileName}`;

		return {
			success: true,
			imagePath,
		};
	} catch (error: any) {
		console.error("Upload avatar error:", error);
		return {
			success: false,
			error: error.message || "Failed to upload avatar",
		};
	}
};

class AdminService {
	login = adminLogin;
	createAdmin = createAdmin;
	verifyToken = verifyToken;
	logout = logout;
	updateAdmin = updateAdmin;
	uploadAvatar = uploadAvatar;
}

export const adminService = new AdminService();
export type AdminServiceType = typeof adminService;
export type { AdminLoginRequest, AdminLoginResult, CreateAdminRequest, CreateAdminResult };
