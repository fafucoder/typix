import { apiClient } from '@/lib/api-client'

export interface Subscribe {
  id: string
  name: string
  description: string | null
  type: 'subscription' | 'credits'
  price: number
  originalPrice: number | null
  credits: number
  duration: number
  sortOrder: number
  isPopular: number
  status: 'active' | 'inactive' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface SubscribeListResult {
  subscribes: Subscribe[]
  total: number
  page: number
  pageSize: number
}

export interface CreateSubscribeData {
  name: string
  description?: string
  type: 'subscription' | 'credits'
  price: number
  originalPrice?: number
  credits: number
  duration: number
  sortOrder?: number
  isPopular?: number
  status?: 'active' | 'inactive'
}

export interface UpdateSubscribeData {
  name?: string
  description?: string
  type?: 'subscription' | 'credits'
  price?: number
  originalPrice?: number
  credits?: number
  duration?: number
  sortOrder?: number
  isPopular?: number
  status?: 'active' | 'inactive'
}

export interface ApiResponse<T> {
  code: string
  data?: T
  message?: string
}

export const subscribeService = {
  // Get subscribe list
  getSubscribes: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<SubscribeListResult> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.search) searchParams.set('search', params.search)

    const response = await apiClient.api.subscribes.$get({
      query: searchParams.toString() ? Object.fromEntries(searchParams) : undefined,
    })
    const result: ApiResponse<SubscribeListResult> = await response.json()
    return result.data || { subscribes: [], total: 0, page: 1, pageSize: 20 }
  },

  // Get subscribe by ID
  getSubscribeById: async (id: string): Promise<Subscribe> => {
    const response = await apiClient.api.subscribes[':id'].$get({
      param: { id },
    })
    const result: ApiResponse<Subscribe> = await response.json()
    if (!result.data) throw new Error(result.message || 'Subscribe not found')
    return result.data
  },

  // Create subscribe
  createSubscribe: async (data: CreateSubscribeData): Promise<Subscribe> => {
    const response = await apiClient.api.subscribes.$post({
      json: data,
    })
    const result: ApiResponse<Subscribe> = await response.json()
    if (!result.data) throw new Error(result.message || 'Failed to create subscribe')
    return result.data
  },

  // Update subscribe
  updateSubscribe: async (id: string, data: UpdateSubscribeData): Promise<Subscribe> => {
    const response = await apiClient.api.subscribes[':id'].$put({
      param: { id },
      json: data,
    } as any)
    const result: ApiResponse<Subscribe> = await response.json()
    if (!result.data) throw new Error(result.message || 'Failed to update subscribe')
    return result.data
  },

  // Delete subscribe
  deleteSubscribe: async (id: string): Promise<void> => {
    const response = await apiClient.api.subscribes[':id'].$delete({
      param: { id },
    })
    const result: any = await response.json()
    if (result.code !== 'ok') throw new Error(result.message || 'Failed to delete subscribe')
  },
}
