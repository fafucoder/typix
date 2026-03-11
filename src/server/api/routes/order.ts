import { Hono } from "hono";
import { type Env, ok, unauthorized } from "@/server/api/util";
import { orderService } from "@/server/service/order";
import { getContext } from "@/server/service/context";
import { subscribe } from "@/server/db/schemas/subscribe";
import { eq } from "drizzle-orm";

const app = new Hono<Env>()
	.basePath("/orders")
	.use(async (c, next) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}
		await next();
	})
	.post("/", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		try {
			const body = await c.req.json();
			const { subscribeId, type, couponId, couponCode, remark } = body;

			if (!subscribeId || !type) {
				return c.json({ code: "error", message: "缺少必要参数" }, 400);
			}

			const subscribeData = await context.db.query.subscribe.findFirst({
				where: eq(subscribe.id, subscribeId),
			});

			if (!subscribeData) {
				return c.json({ code: "error", message: "套餐不存在" }, 404);
			}

			if (subscribeData.status !== "active") {
				return c.json({ code: "error", message: "套餐不可用" }, 400);
			}

			const totalAmount = subscribeData.price;

			const order = await orderService.createOrder({
				userId,
				subscribeId,
				type,
				totalAmount,
				couponId,
				couponCode,
				remark,
			});

			return c.json(ok({ orderId: order.id, orderNo: order.orderNo, actualAmount: order.actualAmount }));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "创建订单失败" }, 500);
		}
	})
	.get("/:id", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const id = c.req.param("id");
		if (!id) {
			return c.json({ code: "error", message: "缺少订单ID" }, 400);
		}

		try {
			const order = await orderService.getOrderById(id);
			if (!order) {
				return c.json({ code: "error", message: "订单不存在" }, 404);
			}

			if (order.userId !== userId) {
				return c.json(unauthorized("无权访问此订单"), 403);
			}

			return c.json(ok(order));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "获取订单失败" }, 500);
		}
	})
	.get("/", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const page = Number(c.req.query("page") || 1);
			const pageSize = Number(c.req.query("pageSize") || 20);
			const search = c.req.query("search") || "";
			const status = c.req.query("status") || "all";

			try {
				const result = await orderService.getOrdersByUserId(userId, page, pageSize, search, status);
				return c.json(ok(result));
			} catch (error: any) {
				return c.json({ code: "error", message: error.message || "获取订单列表失败" }, 500);
			}
	})
	.post("/:id/cancel", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const id = c.req.param("id");
		if (!id) {
			return c.json({ code: "error", message: "缺少订单ID" }, 400);
		}

		try {
			await orderService.cancelOrder(id, userId);
			return c.json(ok({ message: "订单已取消" }));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "取消订单失败" }, 500);
		}
	})
	.post("/:id/confirm", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const id = c.req.param("id");
		if (!id) {
			return c.json({ code: "error", message: "缺少订单ID" }, 400);
		}

		try {
			const body = await c.req.json();
			const { couponId, couponCode } = body;
			
			await orderService.confirmOrder(id, userId, couponId, couponCode);
			return c.json(ok({ message: "订单确认成功" }));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "确认订单失败" }, 500);
		}
	});

export default app;
