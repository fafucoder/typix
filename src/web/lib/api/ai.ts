import { apiClient } from '@/lib/api-client'

export interface AiProvider {
	id: string
	providerId: string
	name: string
	icon?: string | null
	endpoints: string | null
	secretKey: string | null
	enabled: number | boolean
	settings: string | null
	sort: number
	createdAt: string
	updatedAt: string
	models?: AiModel[]
}

export interface AiModel {
	id: string
	providerId: string
	modelId: string
	name: string | null
	type: 'text2image' | 'text2video'
	description: string | null
	settings: string | null
	enabled: number | boolean
	ability: string
	supportedAspectRatios: string | null
	sort: number
	maxInputImages: number | null
	videoDurations: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateProviderRequest {
	providerId: string
	name: string
	icon?: string
	endpoints?: string
	secretKey?: string
	enabled?: boolean
	settings?: string
}

export interface UpdateProviderRequest {
	name?: string
	icon?: string
	endpoints?: string
	secretKey?: string
	enabled?: boolean
	settings?: string
}

export interface CreateModelRequest {
	providerId: string
	modelId: string
	name?: string
	type: 'text2image' | 'text2video'
	description?: string
	settings?: string
	enabled?: boolean
	ability?: 't2i' | 'i2i' | 't2v'
	supportedAspectRatios?: string
	sort?: number
	maxInputImages?: number
	videoDurations?: string
}

export interface UpdateModelRequest {
	modelId?: string
	name?: string
	type?: 'text2image' | 'text2video'
	description?: string
	settings?: string
	enabled?: boolean
	ability?: 't2i' | 'i2i' | 't2v'
	supportedAspectRatios?: string
	sort?: number
	maxInputImages?: number
	videoDurations?: string
}

export interface ApiResponse<T> {
	code: string
	data?: T
	message?: string
}

export const aiService = {
	// Provider APIs
	getProviders: async (): Promise<AiProvider[]> => {
		const response = await apiClient.api.admin.ai.providers.$get()
		const result: ApiResponse<AiProvider[]> = await response.json()
		return result.data || []
	},

	getProviderById: async (id: string): Promise<AiProvider> => {
		const response = await apiClient.api.admin.ai.providers[':id'].$get({
			param: { id },
		})
		const result = await response.json()
		if (!('data' in result) || !result.data) throw new Error(result.message || '获取提供商失败')
		return result.data as any
	},

	createProvider: async (data: CreateProviderRequest): Promise<{ id: string }> => {
		const response = await apiClient.api.admin.ai.providers.$post({
			json: data,
		})
		const result: any = await response.json()
		return { id: result.data?.id || '' }
	},

	updateProvider: async (id: string, data: UpdateProviderRequest): Promise<{ id: string }> => {
		const response = await apiClient.api.admin.ai.providers[':id'].$put({
			param: { id },
			json: data,
		})
		const result: any = await response.json()
		return { id: result.data?.id || '' }
	},

	deleteProvider: async (id: string): Promise<void> => {
		await apiClient.api.admin.ai.providers[':id'].$delete({
			param: { id },
		})
	},

	toggleProvider: async (id: string): Promise<{ enabled: boolean }> => {
		const response = await apiClient.api.admin.ai.providers[':id'].toggle.$patch({
			param: { id },
		})
		const result: any = await response.json()
		return { enabled: result.data?.enabled || false }
	},

	updateProviderSort: async (id: string, sort: number): Promise<void> => {
		await apiClient.api.admin.ai.providers[':id'].sort.$patch({
			param: { id },
			json: { sort },
		})
	},

	// Model APIs
	getModels: async (providerId?: string): Promise<AiModel[]> => {
		const url = new URL('/api/admin/ai/models', window.location.origin)
		if (providerId) {
			url.searchParams.set('providerId', providerId)
		}
		const response = await fetch(url.toString(), {
			credentials: 'include',
		})
		const result: ApiResponse<AiModel[]> = await response.json()
		return result.data || []
	},

	getModelById: async (id: string): Promise<AiModel> => {
		const response = await apiClient.api.admin.ai.models[':id'].$get({
			param: { id },
		})
		const result = await response.json()
		if (!('data' in result) || !result.data) throw new Error(result.message || '获取模型失败')
		return result.data as any
	},

	createModel: async (data: CreateModelRequest): Promise<{ id: string }> => {
		const response = await apiClient.api.admin.ai.models.$post({
			json: data,
		})
		const result: any = await response.json()
		return { id: result.data?.id || '' }
	},

	updateModel: async (id: string, data: UpdateModelRequest): Promise<{ id: string }> => {
		const response = await apiClient.api.admin.ai.models[':id'].$put({
			param: { id },
			json: data,
		})
		const result: any = await response.json()
		return { id: result.data?.id || '' }
	},

	deleteModel: async (id: string): Promise<void> => {
		await apiClient.api.admin.ai.models[':id'].$delete({
			param: { id },
		})
	},

	toggleModel: async (id: string): Promise<{ enabled: boolean }> => {
		const response = await apiClient.api.admin.ai.models[':id'].toggle.$patch({
			param: { id },
		})
		const result: any = await response.json()
		return { enabled: result.data?.enabled || false }
	},
}
