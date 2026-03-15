import { apiClient } from '../api-client'

export interface Order {
  id: string
  userId: string
  subscribeId: string
  orderNo: string
  type: string
  totalAmount: number
  discountAmount: number
  actualAmount: number
  currency: string
  couponId: string | null
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired'
  remark: string | null
  expiresAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  user?: {
    id: string
    name: string
    email: string
  }
  subscribe?: {
    id: string
    name: string
  }
  coupon?: {
    id: string
    code: string
  }
}

export interface OrderListResult {
  orders: Order[]
  total: number
  page: number
  pageSize: number
}

export interface OrderListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  userName?: string
}

export const orderService = {
  getOrders: async (params: OrderListParams): Promise<OrderListResult> => {
    const response = await apiClient.api.orders.$get({
      query: params,
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '获取订单列表失败')
    }
    return result.data
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.api.orders[':id'].$get({
      param: { id },
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '获取订单详情失败')
    }
    return result.data
  },

  cancelOrder: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.api.orders[':id'].cancel.$post({
      param: { id },
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '取消订单失败')
    }
    return result.data
  },
}