import { Hono } from "hono";
import { type Env, authMiddleware, ok, unauthorized } from "@/server/api/util";
import { usageService } from "@/server/service/usage";

const app = new Hono<Env>()
	.basePath("/usage")
	.use("*", authMiddleware)
	.get("/details", async (c) => {
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const orderId = c.req.query("orderId");
		const modelId = c.req.query("modelId");
		const usageType = c.req.query("usageType");
		const startDateStr = c.req.query("startDate");
		const endDateStr = c.req.query("endDate");
		const limitStr = c.req.query("limit");

		const startDate = startDateStr ? new Date(startDateStr) : undefined;
		const endDate = endDateStr ? new Date(endDateStr) : undefined;
		const limit = limitStr ? parseInt(limitStr, 10) : 100;

		const details = await usageService.getUserUsageDetails(userId, {
			orderId,
			modelId,
			usageType,
			startDate,
			endDate,
			limit,
		});

		return c.json(ok(details));
	})
	.get("/daily", async (c) => {
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const modelId = c.req.query("modelId");
		const startDateStr = c.req.query("startDate");
		const endDateStr = c.req.query("endDate");

		const startDate = startDateStr ? new Date(startDateStr) : undefined;
		const endDate = endDateStr ? new Date(endDateStr) : undefined;

		const dailyUsage = await usageService.getUserDailyUsage(userId, {
			modelId,
			startDate,
			endDate,
		});

		return c.json(ok(dailyUsage));
	})
	.get("/stats", async (c) => {
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const orderId = c.req.query("orderId");

		const stats = await usageService.getUserUsageStats(userId, orderId);

		return c.json(ok(stats));
	});

export default app;
