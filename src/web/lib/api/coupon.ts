import { apiClient } from '@/lib/api-client'

export interface Coupon {
  id: string
  code: string
  name: string
  description: string | null
  type: 'percentage' | 'fixed_amount'
  value: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  usageLimit: number
  usageCount: number
  perUserLimit: number
  subscribeIds: string[]
  startAt: string | null
  endAt: string | null
  status: 'active' | 'inactive' | 'expired' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface CouponListResult {
  coupons: Coupon[]
  total: number
  page: number
  pageSize: number
}

export interface CreateCouponData {
  code: string
  name: string
  description?: string
  type: 'percentage' | 'fixed_amount'
  value: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  subscribeIds?: string[]
  startAt?: string
  endAt?: string
  status?: 'active' | 'inactive'
}

export interface UpdateCouponData {
  code?: string
  name?: string
  description?: string
  type?: 'percentage' | 'fixed_amount'
  value?: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  subscribeIds?: string[]
  startAt?: string
  endAt?: string
  status?: 'active' | 'inactive'
}

export interface ApiResponse<T> {
  code: string
  data?: T
  message?: string
}

export const couponService = {
  // Get coupon list
  getCoupons: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }): Promise<CouponListResult> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.status) searchParams.set('status', params.status)

    const response = await apiClient.api.coupons.$get({
      query: searchParams.toString() ? Object.fromEntries(searchParams) : undefined,
    })
    const result: ApiResponse<CouponListResult> = await response.json()
    return result.data || { coupons: [], total: 0, page: 1, pageSize: 20 }
  },

  // Get coupon by ID
  getCouponById: async (id: string): Promise<Coupon> => {
    const response = await apiClient.api.coupons[':id'].$get({
      param: { id },
    })
    const result: ApiResponse<Coupon> = await response.json()
    if (!result.data) throw new Error(result.message || 'Coupon not found')
    return result.data
  },

  // Create coupon
  createCoupon: async (data: CreateCouponData): Promise<Coupon> => {
    const response = await apiClient.api.coupons.$post({
      json: data,
    })
    const result: ApiResponse<Coupon> = await response.json()
    if (!result.data) throw new Error(result.message || 'Failed to create coupon')
    return result.data
  },

  // Update coupon
  updateCoupon: async (id: string, data: UpdateCouponData): Promise<Coupon> => {
    const response = await apiClient.api.coupons[':id'].$put({
      param: { id },
      json: data,
    })
    const result: ApiResponse<Coupon> = await response.json()
    if (!result.data) throw new Error(result.message || 'Failed to update coupon')
    return result.data
  },

  // Delete coupon
  deleteCoupon: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.api.coupons[':id'].$delete({
      param: { id },
    })
    const result: ApiResponse<{ success: boolean }> = await response.json()
    return result.data || { success: false }
  },

  // Delete multiple coupons
  deleteCoupons: async (ids: string[]): Promise<{ success: boolean }> => {
    const response = await apiClient.api.coupons['delete-batch'].$post({
      json: { ids },
    })
    const result: ApiResponse<{ success: boolean }> = await response.json()
    return result.data || { success: false }
  },
}
