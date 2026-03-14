import { fetchWithAuth } from "@/app/lib/api-client";

interface ApiResponse<T> {
	code: string;
	data: T;
	message?: string;
}

export interface UsageDetail {
	id: string;
	userId: string;
	orderId: string;
	modelId: string;
	generationId: string | null;
	usageType: string;
	count: number;
	metadata: string | null;
	createdAt: string;
	model?: {
		id: string;
		name: string;
		modelType: string;
	};
}

export interface DailyUsage {
	date: string;
	modelId: string;
	totalCount: number;
	usageCount: number;
}

export interface UsageStats {
	id: string;
	userId: string;
	orderId: string;
	modelId: string;
	usageCount: number;
	createdAt: string;
	updatedAt: string;
	maxUsage: number;
	remainingUsage: number;
	model?: {
		id: string;
		name: string;
		modelType: string;
	};
}

export const usageApi = {
	getUserUsageDetails: async (
		options?: {
			orderId?: string;
			modelId?: string;
			usageType?: string;
			startDate?: string;
			endDate?: string;
			limit?: number;
		}
	): Promise<UsageDetail[]> => {
		const params = new URLSearchParams();
		if (options?.orderId) params.append("orderId", options.orderId);
		if (options?.modelId) params.append("modelId", options.modelId);
		if (options?.usageType) params.append("usageType", options.usageType);
		if (options?.startDate) params.append("startDate", options.startDate);
		if (options?.endDate) params.append("endDate", options.endDate);
		if (options?.limit) params.append("limit", options.limit.toString());

		const queryString = params.toString();
		const url = `/api/usage/details${queryString ? `?${queryString}` : ""}`;
		const response = await fetchWithAuth(url);
		if (!response.ok) {
			throw new Error("Failed to fetch usage details");
		}
		const result: ApiResponse<UsageDetail[]> = await response.json();
		return result.data;
	},

	getUserDailyUsage: async (
		options?: {
			modelId?: string;
			startDate?: string;
			endDate?: string;
		}
	): Promise<DailyUsage[]> => {
		const params = new URLSearchParams();
		if (options?.modelId) params.append("modelId", options.modelId);
		if (options?.startDate) params.append("startDate", options.startDate);
		if (options?.endDate) params.append("endDate", options.endDate);

		const queryString = params.toString();
		const url = `/api/usage/daily${queryString ? `?${queryString}` : ""}`;
		const response = await fetchWithAuth(url);
		if (!response.ok) {
			throw new Error("Failed to fetch daily usage");
		}
		const result: ApiResponse<DailyUsage[]> = await response.json();
		return result.data;
	},

	getUserUsageStats: async (orderId?: string): Promise<UsageStats[]> => {
		const params = new URLSearchParams();
		if (orderId) params.append("orderId", orderId);

		const queryString = params.toString();
		const url = `/api/usage/stats${queryString ? `?${queryString}` : ""}`;
		const response = await fetchWithAuth(url);
		if (!response.ok) {
			throw new Error("Failed to fetch usage stats");
		}
		const result: ApiResponse<UsageStats[]> = await response.json();
		return result.data;
	},
};
