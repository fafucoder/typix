import { apiClient } from "@/app/lib/api-client";

export type ModelType = "text2image" | "text2video";

export interface SubscribeModel {
	id: string;
	name: string;
	maxUsage: number;
	modelType: ModelType;
}

export interface SubscribeWithModels {
	id: string;
	name: string;
	description: string | null;
	type: "subscription" | "credits";
	price: number;
	originalPrice: number | null;
	credits: number;
	duration: number;
	sortOrder: number;
	isPopular: boolean;
	status: "active" | "inactive" | "deleted";
	models: SubscribeModel[];
}

export interface SubscribeWithModelsResponse {
	monthly: SubscribeWithModels[];
	quarterly: SubscribeWithModels[];
	yearly: SubscribeWithModels[];
}

export interface ApiResponse<T> {
	code: string;
	data?: T;
	message?: string;
}

export interface CurrentSubscription {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	status: string;
}

export const subscribeApi = {
	// Get all subscribes with models, grouped by duration
	getSubscribesWithModels: async (): Promise<ApiResponse<SubscribeWithModelsResponse>> => {
		const response = await apiClient.api.subscribes["with-models"].$get();
		return response.json();
	},
	
	// Get current subscription
	getCurrentSubscription: async (): Promise<ApiResponse<CurrentSubscription | null>> => {
		const response = await apiClient.api.subscribes.current.$get();
		return response.json();
	},
};
