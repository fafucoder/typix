import { Hono } from "hono";
import { type Env, ok, unauthorized } from "@/server/api/util";
import { paymentService } from "@/server/service/payment";
import { orderService } from "@/server/service/order";
import { getContext } from "@/server/service/context";

const app = new Hono<Env>()
	.basePath("/payments")
	.use(async (c, next) => {
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
			const { orderId, channel } = body;

			if (!orderId || !channel) {
				return c.json({ code: "error", message: "缺少必要参数" }, 400);
			}

			const order = await orderService.getOrderById(orderId);
			if (!order) {
				return c.json({ code: "error", message: "订单不存在" }, 404);
			}

			if (order.userId !== userId) {
				return c.json(unauthorized("无权操作此订单"), 403);
			}

			if (order.status !== "pending") {
				return c.json({ code: "error", message: "订单状态不正确" }, 400);
			}

			const payment = await paymentService.createPayment({
				userId,
				orderId,
				channel,
				amount: order.actualAmount,
				clientIp: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "",
				userAgent: c.req.header("user-agent") || "",
			});

			return c.json(ok({ paymentId: payment.id }));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "创建支付失败" }, 500);
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
			return c.json({ code: "error", message: "缺少支付ID" }, 400);
		}

		try {
			const payment = await paymentService.getPaymentByOrderId(id);
			if (!payment) {
				return c.json({ code: "error", message: "支付记录不存在" }, 404);
			}

			if (payment.userId !== userId) {
				return c.json(unauthorized("无权访问此支付记录"), 403);
			}

			return c.json(ok(payment));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "获取支付记录失败" }, 500);
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

		try {
			const result = await paymentService.getPaymentsByUserId(userId, page, pageSize);
			return c.json(ok(result));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "获取支付列表失败" }, 500);
		}
	})
	.post("/:id/callback", async (c) => {
		const context = getContext();
		const user = c.var.user;
		const userId = user?.id;
		if (!userId) {
			return c.json(unauthorized("请先登录"), 401);
		}

		const id = c.req.param("id");
		if (!id) {
			return c.json({ code: "error", message: "缺少支付ID" }, 400);
		}

		try {
			const body = await c.req.json();
			const { status, transactionId, errorCode, errorMessage } = body;

			if (!status) {
				return c.json({ code: "error", message: "缺少支付状态" }, 400);
			}

			await paymentService.updatePaymentStatus(id, status, {
				transactionId,
				errorCode,
				errorMessage,
				processedAt: new Date(),
			});

			if (status === "success") {
				const payment = await paymentService.getPaymentByOrderId(id);
				if (payment) {
					await orderService.updateOrderStatus(payment.orderId, "paid");
					const order = await orderService.getOrderById(payment.orderId);
					if (order && order.couponId) {
						await orderService.markCouponUsed(payment.orderId, order.couponId, payment.amount);
					}
				}
			}

			return c.json(ok({ message: "支付状态更新成功" }));
		} catch (error: any) {
			return c.json({ code: "error", message: error.message || "更新支付状态失败" }, 500);
		}
	});

export default app;
