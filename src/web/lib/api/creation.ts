import { apiClient } from '@/lib/api-client'

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

export interface ApiResponse<T> {
	code: string
	data?: T
	message?: string
}

export const creationService = {
	getCreations: async (): Promise<Creation[]> => {
		const response = await apiClient.api.creations.$get()
		const result: ApiResponse<Creation[]> = await response.json()
		return result.data || []
	},

	getCreationById: async (id: string): Promise<Creation> => {
		const response = await apiClient.api.creations[':id'].$get({
			param: { id },
		})
		const result: ApiResponse<Creation> = await response.json()
		return result.data as Creation
	},
}
