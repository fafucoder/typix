import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { DrizzleDb } from "@/admin/db";
import type { createAuth } from "@/admin/lib/auth";
import type { Code } from "@/admin/lib/exception";
import type { AdminRole, AdminStatus } from "@/admin/db/schemas/admin";

type Auth = ReturnType<typeof createAuth>;

type AdminUser = {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	image?: string | null;
	role: AdminRole;
	department?: string | null;
	permissions?: string[] | null;
	status: AdminStatus;
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
		user: AdminUser | null;
		session: Auth["$Infer"]["Session"]["session"] | null;
	};
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
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
