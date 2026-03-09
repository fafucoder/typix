import { serverApiClient } from '@/lib/server-api-client'

export type CreationType = 'text2image' | 'text2video'
export type CreationStatus = 'pending' | 'generating' | 'completed' | 'failed'
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export interface Creation {
	id: string
	title: string
	userId: string
	provider: string
	model: string
	type: CreationType
	prompt: string
	aspectRatio: AspectRatio
	imageCount: number
	status: CreationStatus
	resultUrls: string | null
	errorMessage: string | null
	deleted: number
	createdAt: string
	updatedAt: string
}

export interface CreateCreationRequest {
	title: string
	provider: string
	model: string
	type: CreationType
	prompt: string
	aspectRatio?: AspectRatio
	imageCount?: number
}

export interface UpdateCreationRequest {
	title?: string
	status?: CreationStatus
	resultUrls?: string
	errorMessage?: string
}

export interface ApiResponse<T> {
	code: string
	data?: T
	message?: string
}

export const creationService = {
	// Get all creations for current user
	getCreations: async (): Promise<Creation[]> => {
		const response = await serverApiClient.api.creations.$get()
		const result: ApiResponse<Creation[]> = await response.json()
		return result.data || []
	},

	// Get creation by ID
	getCreationById: async (id: string): Promise<Creation> => {
		const response = await serverApiClient.api.creations[':id'].$get({
			param: { id },
		})
		const result: ApiResponse<Creation> = await response.json()
		return result.data as Creation
	},

	// Create new creation
	createCreation: async (data: CreateCreationRequest): Promise<{ id: string }> => {
		const response = await serverApiClient.api.creations.$post({
			json: data,
		})
		const result: any = await response.json()
		return { id: result.data?.id || '' }
	},

	// Update creation
	updateCreation: async (id: string, data: UpdateCreationRequest): Promise<{ success: boolean }> => {
		const response = await serverApiClient.api.creations[':id'].$put({
			param: { id },
			json: data,
		})
		const result: any = await response.json()
		return { success: result.data?.success || false }
	},

	// Delete creation
	deleteCreation: async (id: string): Promise<{ success: boolean }> => {
		const response = await serverApiClient.api.creations[':id'].$delete({
			param: { id },
		})
		const result: any = await response.json()
		return { success: result.data?.success || false }
	},
}
