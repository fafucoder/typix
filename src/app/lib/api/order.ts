import { fetchWithAuth } from "@/app/lib/api-client";

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
	expiresAt: string | null;
	cancelledAt: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
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
			modelType: "text2image" | "text2video" | "text2text" | "image2image" | "image2video" | "other";
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
		processedAt: string | null;
	}>;
}

export interface CreateOrderRequest {
	subscribeId: string;
	type: "subscription" | "credits";
	couponId?: string;
	couponCode?: string;
	remark?: string;
}

export interface CreateOrderResponse {
	orderId: string;
	orderNo: string;
	actualAmount: number;
}

export interface OrderListResponse {
	orders: OrderWithDetails[];
	total: number;
}

export const orderApi = {
	createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
		const response = await fetchWithAuth("/api/orders", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});
		const result = await response.json();
		if (result.code !== "ok") {
			throw new Error(result.message || "创建订单失败");
		}
		return result.data;
	},

	getOrder: async (id: string): Promise<OrderWithDetails> => {
		const response = await fetchWithAuth(`/api/orders/${id}`, {
			method: "GET",
		});
		const result = await response.json();
		if (result.code !== "ok") {
			throw new Error(result.message || "获取订单失败");
		}
		return result.data;
	},

	getOrders: async (page: number = 1, pageSize: number = 20, searchTerm: string = "", status: string = "all"): Promise<OrderListResponse> => {
			const params = new URLSearchParams({
				page: page.toString(),
				pageSize: pageSize.toString(),
				search: searchTerm,
				status: status,
			});
			const response = await fetchWithAuth(`/api/orders?${params.toString()}`, {
				method: "GET",
			});
			const result = await response.json();
			if (result.code !== "ok") {
				throw new Error(result.message || "获取订单列表失败");
			}
			return result.data;
		},

	cancelOrder: async (id: string): Promise<{ message: string }> => {
		const response = await fetchWithAuth(`/api/orders/${id}/cancel`, {
			method: "POST",
		});
		const result = await response.json();
		if (result.code !== "ok") {
			throw new Error(result.message || "取消订单失败");
		}
		return result.data;
	},
};
