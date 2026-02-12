import { UpdateSettingsSchema, settingsService } from "@/server/service/settings";
import { authService, UpdatePasswordSchema } from "@/server/service/auth";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type Env, authMiddleware, ok } from "../util";

const app = new Hono<Env>()
	.basePath("/settings")
	.use(authMiddleware)
	.post("/updateSettings", zValidator("json", UpdateSettingsSchema), async (c) => {
		const user = c.var.user!;
		const req = c.req.valid("json");

		await settingsService.updateSettings(req, { userId: user.id });
		return c.json(ok());
	})
	.post("/getSettings", async (c) => {
		const user = c.var.user!;

		return c.json(ok(await settingsService.getSettings({ userId: user.id })));
	})
	.post("/updatePassword", zValidator("json", UpdatePasswordSchema), async (c) => {
		const user = c.var.user!;
		const req = c.req.valid("json");

		try {
			const result = await authService.updatePassword(req, { userId: user.id });

			if (!result.success) {
				return c.json({
					code: "error",
					errorCode: result.errorCode,
					message: result.error,
				}, 400);
			}

			return c.json(ok());
		} catch (error: any) {
			console.error("Password update error:", error);
			return c.json({
				code: "error",
				message: error.message || "Failed to update password",
			}, 500);
		}
	});

export default app;
