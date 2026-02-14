import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { DrizzleDb } from "../db";
import type { createAuth } from "../lib/auth";
import type { Code } from "../lib/exception";

type Auth = ReturnType<typeof createAuth>;

// 由于 Auth["$Infer"]["Session"]["user"] 是从 better-auth 库推断的类型
// 我们无法直接修改它的定义，只能通过扩展的方式添加额外属性
type UserWithRole = {
	// 基础用户属性（与 Auth["$Infer"]["Session"]["user"] 保持一致）
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	image?: string | null;
	
	// 扩展属性
	role?: "admin" | "user";
	inviteCode?: string | null;
	parentUserId?: string | null;
};

export type Env = {
	Bindings: {
		DB: D1Database;
		AI: Ai;
		EMAIL: string;
		RESEND_APIKEY: string;
		PROVIDER_CLOUDFLARE_BUILTIN?: "true" | "false";
		AUTH_EMAIL_VERIFICATION_ENABLED?: "true" | "false";
		AUTH_EMAIL_RESEND_API_KEY?: string;
		AUTH_EMAIL_RESEND_FROM?: string;
		AUTH_SOCIAL_GOOGLE_ENABLED?: "true" | "false";
		AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;
		AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;
		AUTH_SOCIAL_GITHUB_ENABLED?: "true" | "false";
		AUTH_SOCIAL_GITHUB_CLIENT_ID?: string;
		AUTH_SOCIAL_GITHUB_CLIENT_SECRET?: string;
	};
	Variables: {
		db: DrizzleDb;
		auth: Auth;
		user: UserWithRole | null;
		session: Auth["$Infer"]["Session"]["session"] | null;
	};
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
	// if path follow /api/xxx/no-auth/, skip auth check
	const regex = /^\/api\/[^/]+\/no-auth\//;
	if (regex.test(c.req.path)) {
		return await next();
	}

	const user = c.var.user;

	if (!user) {
		throw new HTTPException(401, { message: "Authentication required" });
	}

	await next();
});

export interface ApiResult<T> {
	code: Code;
	data?: T;
	message?: string;
}

export function ok<T>(data?: T): ApiResult<T> {
	return { code: "ok", data };
}

export function error<T>(code: Code, message: string): ApiResult<T> {
	return { code, message };
}
