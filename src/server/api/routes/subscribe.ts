import { Hono } from "hono";
import { type Env, authMiddleware, ok, unauthorized } from "@/server/api/util";
import { subscribeService } from "@/server/service/subscribe";

const app = new Hono<Env>()
	.basePath("/subscribes")
	// Get all subscribes with models, grouped by duration
	.get("/with-models", async (c) => {
		const result = await subscribeService.getSubscribesWithModels();
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	// Get current subscription for user
	.use("/current", authMiddleware)
	.get("/current", async (c) => {
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const result = await subscribeService.getCurrentSubscription(userId);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	});

export default app;
