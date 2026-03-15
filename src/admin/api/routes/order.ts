import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { orderService } from "@/admin/service/order";

const app = new Hono<Env>()
	.basePath("/orders")
	// Get order list
	.get("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const page = Number(c.req.query("page")) || 1;
		const pageSize = Number(c.req.query("pageSize")) || 20;
		const search = c.req.query("search");
		const status = c.req.query("status");
		const userId = c.req.query("userId");

		const result = await orderService.getOrders({ page, pageSize, search, status, userId });
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	// Get order by ID
	.get("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await orderService.getOrderById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.order));
	})
	// Cancel order
	.post("/:id/cancel", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await orderService.cancelOrder(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Refund order
	.post("/:id/refund", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const { refundAmount, refundReason } = await c.req.json<{ refundAmount: number; refundReason: string }>();
		const result = await orderService.refundOrder(id, refundAmount, refundReason);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
