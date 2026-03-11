import { order, userCoupon, payment, subscribe, subscribeModel, aiModels } from "@/server/db/schemas";
import { eq, and, sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getContext } from "@/server/service/context";
import type { ModelType } from "@/server/db/schemas/ai";

export interface CreateOrderData {
	userId: string;
	subscribeId: string;
	type: "subscription" | "credits";
	totalAmount: number;
	couponId?: string;
	couponCode?: string;
	remark?: string;
}

export interface Order {
	id: string;
	userId: string;
	subscribeId: string;
	orderNo: string;
	type: "subscription" | "credits";
	totalAmount: number;
	discountAmount: number;
	actualAmount: number;
	currency: string;
	couponId: string | null;
	status: "pending" | "paid" | "cancelled" | "refunded" | "expired";
	remark: string | null;
	expiresAt: Date | null;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

export interface OrderWithDetails extends Order {
	subscribe?: {
		id: string;
		name: string;
		description: string | null;
		type: "subscription" | "credits";
		price: number;
		originalPrice: number | null;
		credits: number;
		duration: number;
		sortOrder: number;
		isPopular: number;
		status: "active" | "inactive" | "deleted";
		models?: Array<{
			id: string;
			name: string;
			maxUsage: number;
			modelType: ModelType;
		}>;
	};
	coupon?: {
		id: string;
		code: string;
		name: string;
		description: string | null;
		type: "percentage" | "fixed_amount";
		value: number;
	};
	payments?: Array<{
		id: string;
		transactionId: string | null;
		channel: string;
		amount: number;
		currency: string;
		status: string;
		processedAt: Date | null;
	}>;
}

export const orderService = {
	createOrder: async (data: CreateOrderData): Promise<Order> => {
		const { db } = getContext();
		let discountAmount = 0;
		let couponData = null;

		if (data.couponId || data.couponCode) {
			// 暂时移除优惠券验证逻辑，因为 user_coupon 表结构不完整
			// 后续可以根据实际情况添加优惠券验证
			discountAmount = 0;
		}

		const actualAmount = data.totalAmount - discountAmount;
		if (actualAmount <= 0) {
			throw new Error("订单金额不能为0");
		}

		const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
		const now = new Date();

		const newOrder = {
			id: nanoid(),
			userId: data.userId,
			subscribeId: data.subscribeId,
			orderNo,
			type: data.type,
			totalAmount: data.totalAmount,
			discountAmount,
			actualAmount,
			currency: "CNY",
			couponId: data.couponId || null,
			status: "pending",
			remark: data.remark || null,
			expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30分钟后过期
			cancelledAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
		};

		await db.insert(order).values(newOrder);

		return newOrder as Order;
	},

	getOrderById: async (id: string): Promise<OrderWithDetails | null> => {
		const { db } = getContext();
		
		// 使用 select 查询订单
		const orderResult = await db.select().from(order).where(eq(order.id, id)).limit(1);

		if (!orderResult || orderResult.length === 0) {
			return null;
		}

		const orderData = orderResult[0];

		// 查询关联的套餐信息
		const subscribeResult = await db.select().from(subscribe).where(eq(subscribe.id, orderData.subscribeId)).limit(1);
		const subscribeData = subscribeResult[0];

		// 查询套餐的模型信息
		let models: Array<{ id: string; name: string; maxUsage: number; modelType: ModelType }> = [];
		if (subscribeData) {
			const modelsResult = await db
				.select({
					subscribeModel: {
						id: subscribeModel.id,
						maxUsage: subscribeModel.maxUsage,
					},
					model: {
						id: aiModels.id,
						modelId: aiModels.modelId,
						name: aiModels.name,
						type: aiModels.type,
					}
				})
				.from(subscribeModel)
				.innerJoin(aiModels, eq(subscribeModel.modelId, aiModels.id))
				.where(
					and(
						eq(subscribeModel.subscribeId, subscribeData.id),
						eq(subscribeModel.enabled, 1)
					)
				)
				.orderBy(desc(subscribeModel.sortOrder));
			
			models = modelsResult.map((m) => ({
				id: m.subscribeModel.id,
				name: m.model.name || m.model.modelId,
				maxUsage: m.subscribeModel.maxUsage,
				modelType: m.model.type,
			}));
		}

		return {
			...orderData,
			subscribe: subscribeData ? {
				...subscribeData,
				isPopular: subscribeData.isPopular === 1,
				models,
			} : undefined,
		} as OrderWithDetails;
	},

	getOrdersByUserId: async (userId: string, page: number = 1, pageSize: number = 20, search: string = "", status: string = "all"): Promise<{ orders: OrderWithDetails[]; total: number }> => {
			const { db } = getContext();
			const offset = (page - 1) * pageSize;

			// 构建查询条件
			let conditions = [eq(order.userId, userId)];

			// 添加状态筛选
			if (status !== "all") {
				conditions.push(eq(order.status, status));
			}

			// 执行查询
			const ordersResult = await db
				.select()
				.from(order)
				.where(and(...conditions))
				.orderBy(desc(order.createdAt))
				.limit(pageSize)
				.offset(offset);

			// 计算总数
			const countResult = await db
				.select({ count: sql<number>`count(*)` })
				.from(order)
				.where(and(...conditions));

			// 为每个订单查询套餐信息
			const ordersWithDetails = await Promise.all(
				ordersResult.map(async (orderItem) => {
					const subscribeResult = await db.select().from(subscribe).where(eq(subscribe.id, orderItem.subscribeId)).limit(1);
					return {
						...orderItem,
						subscribe: subscribeResult[0] || undefined,
					} as OrderWithDetails;
				})
			);

			// 应用搜索过滤（由于需要关联查询，这里在内存中过滤）
			let filteredOrders = ordersWithDetails;
			if (search) {
				const searchLower = search.toLowerCase();
				filteredOrders = ordersWithDetails.filter(orderItem => 
					orderItem.orderNo.toLowerCase().includes(searchLower) ||
					(orderItem.subscribe?.name && orderItem.subscribe.name.toLowerCase().includes(searchLower))
				);
			}

			return {
				orders: filteredOrders,
				total: countResult[0]?.count || 0,
			};
		},

	updateOrderStatus: async (id: string, status: "paid" | "cancelled" | "refunded" | "expired"): Promise<void> => {
		const { db } = getContext();
		const updateData: any = {
			status,
			updatedAt: new Date(),
		};

		if (status === "cancelled") {
			updateData.cancelledAt = new Date();
		}

		await db.update(order).set(updateData).where(eq(order.id, id));
	},

	markCouponUsed: async (orderId: string, couponId: string, discountAmount: number): Promise<void> => {
		const { db } = getContext();
		await db.update(userCoupon).set({
			status: "used",
			orderId,
			discountAmount,
			usedAt: new Date(),
			updatedAt: new Date(),
		}).where(eq(userCoupon.id, couponId));
	},

	cancelOrder: async (id: string, userId: string): Promise<void> => {
		const { db } = getContext();
		const existingOrderResult = await db.select().from(order).where(eq(order.id, id)).limit(1);

		if (!existingOrderResult || existingOrderResult.length === 0) {
			throw new Error("订单不存在");
		}

		const existingOrder = existingOrderResult[0];

		if (existingOrder.userId !== userId) {
			throw new Error("无权操作此订单");
		}

		if (existingOrder.status !== "pending") {
			throw new Error("只能取消待支付订单");
		}

		await db.update(order).set({
			status: "cancelled",
			cancelledAt: new Date(),
			updatedAt: new Date(),
		}).where(eq(order.id, id));

		if (existingOrder.couponId) {
			await db.update(userCoupon).set({
				status: "unused",
				orderId: null,
				discountAmount: null,
				usedAt: null,
				updatedAt: new Date(),
			}).where(eq(userCoupon.id, existingOrder.couponId));
		}
	},

	confirmOrder: async (id: string, userId: string, couponId?: string, couponCode?: string): Promise<void> => {
		const { db } = getContext();
		const existingOrderResult = await db.select().from(order).where(eq(order.id, id)).limit(1);

		if (!existingOrderResult || existingOrderResult.length === 0) {
			throw new Error("订单不存在");
		}

		const existingOrder = existingOrderResult[0];

		if (existingOrder.userId !== userId) {
			throw new Error("无权操作此订单");
		}

		if (existingOrder.status !== "pending") {
			throw new Error("订单状态不正确");
		}

		let discountAmount = 0;
		let finalCouponId = couponId || existingOrder.couponId;

		if (finalCouponId || couponCode) {
			const { coupon } = await import("@/server/db/schemas/coupon");
			
			let couponData = null;
			if (finalCouponId) {
				const couponResult = await db.select().from(coupon).where(eq(coupon.id, finalCouponId)).limit(1);
				couponData = couponResult[0];
			} else if (couponCode) {
				const couponResult = await db.select().from(coupon).where(eq(coupon.code, couponCode)).limit(1);
				couponData = couponResult[0];
				if (couponData) {
					finalCouponId = couponData.id;
				}
			}

			if (couponData) {
				if (couponData.type === "percentage") {
					discountAmount = Math.floor(existingOrder.totalAmount * couponData.value / 100);
					if (couponData.maxDiscountAmount && discountAmount > couponData.maxDiscountAmount) {
						discountAmount = couponData.maxDiscountAmount;
					}
				} else if (couponData.type === "fixed_amount") {
					discountAmount = couponData.value;
				}

				if (discountAmount > existingOrder.totalAmount) {
					discountAmount = existingOrder.totalAmount;
				}
			}
		}

		const actualAmount = Math.max(0, existingOrder.totalAmount - discountAmount);
		if (actualAmount < 0) {
			throw new Error("订单金额不能为负");
		}

		const now = new Date();
		const subscribeData = await db.select().from(subscribe).where(eq(subscribe.id, existingOrder.subscribeId)).limit(1);
		const duration = subscribeData[0]?.duration || 30;
		const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

		await db.update(order).set({
			status: "paid",
			discountAmount,
			actualAmount,
			couponId: finalCouponId,
			expiresAt,
			updatedAt: now,
		}).where(eq(order.id, id));

		if (finalCouponId) {
			try {
				await db.update(userCoupon).set({
					status: "used",
					orderId: id,
					discountAmount,
					usedAt: now,
					updatedAt: now,
				}).where(eq(userCoupon.couponId, finalCouponId));
			} catch (e) {
				console.log("Marking coupon used failed, but order confirmed successfully", e);
			}
		}
	},
};
