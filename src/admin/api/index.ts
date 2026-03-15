import { env } from "hono/adapter";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { Resend } from "resend";
import { createDb } from "@/admin/db";
import { admin } from "@/admin/db/schemas/admin";
import { adminSession } from "@/admin/db/schemas/admin";
import { eq } from "drizzle-orm";
import { type AuthConfig, createAuth } from "@/admin/lib/auth";
import { ServiceException } from "@/admin/lib/exception";
import { initContext } from "@/admin/service/context";
import adminRouter from "./routes/admin";
import userRouter from "./routes/user";
import subscribeRouter from "./routes/subscribe";
import couponRouter from "./routes/coupon";
import subscribeModelRouter from "./routes/subscribe-model";
import orderRouter from "./routes/order";
import chatRouter from "./routes/chat";
import type { ApiResult, Env } from "./util";

const factory = createFactory<Env>({
	initApp: async (app) => {
		app.use(async (c, next) => {
			const db = await createDb(c.env.DB);
			const authConfig: AuthConfig = {
				email: {
					verification: env(c).AUTH_EMAIL_VERIFICATION_ENABLED === "true",
					resend: {
						apiKey: env(c).AUTH_EMAIL_RESEND_API_KEY || "",
						from: env(c).AUTH_EMAIL_RESEND_FROM || "",
					},
				},
				social: {
					google: {
						enabled: env(c).AUTH_SOCIAL_GOOGLE_ENABLED === "true",
						clientId: env(c).AUTH_SOCIAL_GOOGLE_CLIENT_ID || "",
						clientSecret: env(c).AUTH_SOCIAL_GOOGLE_CLIENT_SECRET || "",
					},
					github: {
						enabled: env(c).AUTH_SOCIAL_GITHUB_ENABLED === "true",
						clientId: env(c).AUTH_SOCIAL_GITHUB_CLIENT_ID || "",
						clientSecret: env(c).AUTH_SOCIAL_GITHUB_CLIENT_SECRET || "",
					},
				},
				cookieDomain: env(c).COOKIE_DOMAIN ? String(env(c).COOKIE_DOMAIN) : undefined,
			};

			c.set("db", db);
			c.set("auth", createAuth(db, authConfig));
			initContext({
				db,
				AI: c.env.AI,
				resend: authConfig.email.verification
					? {
							instance: new Resend(authConfig.email.resend.apiKey),
							from: authConfig.email.resend.from,
						}
					: undefined,
				providerCloudflareBuiltin: c.env.PROVIDER_CLOUDFLARE_BUILTIN === "true" || false,
			});
			await next();
		});
	},
});

const app = factory.createApp();

app.use(logger());

// Verify Bearer token from admin session
const verifyBearerToken = async (db: any, authHeader: string | undefined): Promise<any | null> => {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}

	const token = authHeader.substring(7);

	try {
		const sessions = await db
			.select()
			.from(adminSession)
			.where(eq(adminSession.token, token))
			.limit(1);

		if (sessions.length === 0) {
			return null;
		}

		const sessionRecord = sessions[0];

		if (!sessionRecord || new Date() > sessionRecord.expiresAt) {
			return null;
		}

		const admins = await db
			.select()
			.from(admin)
			.where(eq(admin.id, sessionRecord.userId))
			.limit(1);

		if (admins.length === 0) {
			return null;
		}

		return admins[0];
	} catch (error) {
		console.error("Verify bearer token error:", error);
		return null;
	}
};

app.use("*", async (c, next) => {
	try {
		const db = c.var.db;
		const authHeader = c.req.header("Authorization");

		// Try Bearer token auth first
		if (authHeader && authHeader.startsWith("Bearer ")) {
			const adminUser = await verifyBearerToken(db, authHeader);
			if (adminUser) {
				c.set("user", adminUser);
				c.set("session", null);
				return await next();
			}
		}

		// Fall back to better-auth session
		const session = await c.var.auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session) {
			c.set("user", null);
			c.set("session", null);
			return await next();
		}

		const admins = await db.select().from(admin).where(eq(admin.id, session.user.id)).limit(1);

		if (admins.length > 0 && admins[0]) {
			c.set("user", admins[0]);
		} else {
			c.set("user", session.user);
		}

		c.set("session", session.session);
	} catch (error) {
		console.error("Session error:", error);
		c.set("user", null);
		c.set("session", null);
	}
	return await next();
});

app.on(["POST", "GET"], ["/api/auth/*"], (c) => c.var.auth.handler(c.req.raw));

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json<ApiResult<unknown>>(
			{
				code: (() => {
					switch (err.status) {
						case 401:
							return "unauthorized";
						case 403:
							return "forbidden";
						case 404:
							return "not_found";
						default:
							return "error";
					}
				})(),
				message: err.message,
			},
			err.status,
		);
	}

	if (err instanceof ServiceException) {
		return c.json<ApiResult<unknown>>(
			{
				code: err.code,
				message: err.message,
			},
			200,
		);
	}

	console.error("Unhandled error:", err);
	return c.json<ApiResult<unknown>>({
		code: "error",
		message: "Internal Server Error",
	});
});

const route = app.basePath("/api").route("/", adminRouter).route("/", userRouter).route("/", subscribeRouter).route("/", couponRouter).route("/", subscribeModelRouter).route("/", orderRouter).route("/", chatRouter);

export type AppType = typeof route;
export default app;
