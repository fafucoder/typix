import useSWR from "swr";
import { orderApi, type CreateOrderRequest, type OrderWithDetails, type OrderListResponse } from "@/app/lib/api/order";

export const useOrderService = () => {
	return {
		createOrder: async (data: CreateOrderRequest) => {
			return orderApi.createOrder(data);
		},

		getOrder: (id: string) => ({
			swr: (key: string) => useSWR<OrderWithDetails>(key, () => orderApi.getOrder(id)),
		}),

		getOrders: (page: number = 1, pageSize: number = 20, searchTerm: string = "", status: string = "all") => ({
			swr: (key: string) => useSWR<OrderListResponse>(key, () => orderApi.getOrders(page, pageSize, searchTerm, status)),
		}),

		cancelOrder: async (id: string) => {
			return orderApi.cancelOrder(id);
		},

		confirmOrder: async (id: string, couponId?: string, couponCode?: string) => {
			return orderApi.confirmOrder(id, couponId, couponCode);
		},
	};
};
