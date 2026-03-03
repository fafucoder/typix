import { adminService, AdminLoginSchema, CreateAdminSchema } from "@/server/service/admin";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type Env, ok } from "../util";

const app = new Hono<Env>()
	.basePath("/admin")
	.post("/login", zValidator("json", AdminLoginSchema), async (c) => {
		const req = c.req.valid("json");
		const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");
		const userAgent = c.req.header("user-agent");

		const result = await adminService.login(req, { ip, userAgent });

		if (!result.success) {
			return c.json({
				code: "error",
				errorCode: result.errorCode,
				message: result.error,
			}, 400);
		}

		return c.json(ok({
			token: result.token,
			admin: result.admin,
		}));
	})
	.post("/create", zValidator("json", CreateAdminSchema), async (c) => {
		const req = c.req.valid("json");

		const result = await adminService.createAdmin(req);

		if (!result.success) {
			return c.json({
				code: "error",
				errorCode: result.errorCode,
				message: result.error,
			}, 400);
		}

		return c.json(ok({
			adminId: result.adminId,
		}));
	})
	.get("/verify", async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		const result = await adminService.verifyToken(token);

		if (!result.success) {
			return c.json({
				code: "error",
				message: "Invalid or expired token",
			}, 401);
		}

		return c.json(ok({
			admin: result.admin,
		}));
	})
	.post("/logout", async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		await adminService.logout(token);

		return c.json(ok());
	});

export default app;
