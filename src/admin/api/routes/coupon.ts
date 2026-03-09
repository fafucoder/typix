import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { couponService } from "@/admin/service/coupon";

const app = new Hono<Env>()
	.basePath("/coupons")
	// Get coupon list
	.get("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const page = Number(c.req.query("page")) || 1;
		const pageSize = Number(c.req.query("pageSize")) || 20;
		const search = c.req.query("search");
		const status = c.req.query("status");

		const result = await couponService.getCoupons({ page, pageSize, search, status });
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	// Get coupon by ID
	.get("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await couponService.getCouponById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.coupon));
	})
	// Create coupon
	.post("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const data = await c.req.json();
		const result = await couponService.createCoupon(data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.coupon));
	})
	// Update coupon
	.put("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const data = await c.req.json();
		const result = await couponService.updateCoupon(id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok(result.coupon));
	})
	// Delete coupon
	.delete("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await couponService.deleteCoupon(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Delete multiple coupons
	.post("/delete-batch", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const { ids } = await c.req.json<{ ids: string[] }>();
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return c.json({ code: "error", message: "Invalid ids" }, 400);
		}

		const result = await couponService.deleteCoupons(ids);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
