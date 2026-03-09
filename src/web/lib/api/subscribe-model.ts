import { apiClient } from '@/lib/api-client'

export interface SubscribeModel {
	id: string
	subscribeId: string
	modelId: string
	maxUsage: number
	enabled: number
	sortOrder: number
	createdAt: string
	updatedAt: string
	model?: {
		id: string
		modelId: string
		name: string
		type: string
		providerId: string
		provider?: {
			id: string
			providerId: string
			name: string
		}
	}
}

export interface CreateSubscribeModelData {
	subscribeId: string
	modelId: string
	maxUsage?: number
	enabled?: number
	sortOrder?: number
}

export interface UpdateSubscribeModelData {
	maxUsage?: number
	enabled?: number
	sortOrder?: number
}

export interface ApiResponse<T> {
	code: string
	data?: T
	message?: string
}

export const subscribeModelService = {
	// Get models for a subscribe
	getSubscribeModels: async (subscribeId: string): Promise<{ models: SubscribeModel[] }> => {
		const response = await apiClient.api['subscribe-models'][':subscribeId'].$get({
			param: { subscribeId },
		})
		const result: ApiResponse<SubscribeModel[]> = await response.json()
		return { models: result.data || [] }
	},

	// Get available models not yet assigned to subscribe
	getAvailableModels: async (subscribeId: string): Promise<{ models: any[] }> => {
		const response = await apiClient.api['subscribe-models'].available[':subscribeId'].$get({
			param: { subscribeId },
		})
		const result: ApiResponse<any[]> = await response.json()
		return { models: result.data || [] }
	},

	// Create subscribe model
	createSubscribeModel: async (data: CreateSubscribeModelData): Promise<{ model: SubscribeModel }> => {
		const response = await apiClient.api['subscribe-models'].$post({
			json: data,
		})
		const result: ApiResponse<SubscribeModel> = await response.json()
		if (!result.data) throw new Error(result.message || 'Failed to create subscribe model')
		return { model: result.data }
	},

	// Update subscribe model
	updateSubscribeModel: async (id: string, data: UpdateSubscribeModelData): Promise<{ model: SubscribeModel }> => {
		const response = await apiClient.api['subscribe-models'][':id'].$put({
			param: { id },
			json: data,
		})
		const result: ApiResponse<SubscribeModel> = await response.json()
		if (!result.data) throw new Error(result.message || 'Failed to update subscribe model')
		return { model: result.data }
	},

	// Delete subscribe model
	deleteSubscribeModel: async (id: string): Promise<{ success: boolean }> => {
		const response = await apiClient.api['subscribe-models'][':id'].$delete({
			param: { id },
		})
		const result: ApiResponse<{ success: boolean }> = await response.json()
		return { success: result.data?.success || false }
	},

	// Delete multiple subscribe models
	deleteSubscribeModels: async (ids: string[]): Promise<{ success: boolean }> => {
		const response = await apiClient.api['subscribe-models']['delete-batch'].$post({
			json: { ids },
		})
		const result: ApiResponse<{ success: boolean }> = await response.json()
		return { success: result.data?.success || false }
	},
}
