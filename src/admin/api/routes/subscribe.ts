import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { subscribeService } from "@/admin/service/subscribe";

const app = new Hono<Env>()
	.basePath("/subscribes")
	// Get subscribe list
	.get("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const page = Number(c.req.query("page")) || 1;
		const pageSize = Number(c.req.query("pageSize")) || 20;
		const search = c.req.query("search");
		const status = c.req.query("status");

		const result = await subscribeService.getSubscribes({ page, pageSize, search, status });
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	// Get subscribe by ID
	.get("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await subscribeService.getSubscribeById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.subscribe));
	})
	// Create subscribe
	.post("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const data = await c.req.json();
		const result = await subscribeService.createSubscribe(data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.subscribe));
	})
	// Update subscribe
	.put("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const data = await c.req.json();
		const result = await subscribeService.updateSubscribe(id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.subscribe));
	})
	// Delete subscribe
	.delete("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await subscribeService.deleteSubscribe(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Delete multiple subscribes
	.post("/delete-batch", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const { ids } = await c.req.json<{ ids: string[] }>();
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return c.json({ code: "error", message: "Invalid ids" }, 400);
		}

		const result = await subscribeService.deleteSubscribes(ids);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
