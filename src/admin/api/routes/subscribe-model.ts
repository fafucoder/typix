import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { subscribeModelService } from "@/admin/service/subscribe-model";

const app = new Hono<Env>()
	.basePath("/subscribe-models")
	// Get available models not yet assigned to subscribe
	.get("/available/:subscribeId", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const subscribeId = c.req.param("subscribeId");
		const result = await subscribeModelService.getAvailableModels(subscribeId);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.models));
	})
	// Get models for a subscribe
	.get("/:subscribeId", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const subscribeId = c.req.param("subscribeId");
		const result = await subscribeModelService.getSubscribeModels(subscribeId);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.models));
	})
	// Create subscribe model
	.post("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const data = await c.req.json();
		const result = await subscribeModelService.createSubscribeModel(data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.model), 201);
	})
	// Update subscribe model
	.put("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const data = await c.req.json();
		const result = await subscribeModelService.updateSubscribeModel(id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.model));
	})
	// Delete subscribe model
	.delete("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await subscribeModelService.deleteSubscribeModel(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Delete multiple subscribe models
	.post("/delete-batch", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const data = await c.req.json();
		const ids = data.ids || [];
		const result = await subscribeModelService.deleteSubscribeModels(ids);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
