import { apiClient } from '@/lib/api-client'

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  inviteCode: string | null
  parentUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface UserListResult {
  users: User[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  code: string
  data?: T
  message?: string
}

export const userService = {
  // Get user list
  getUsers: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<UserListResult> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.search) searchParams.set('search', params.search)

    const response = await apiClient.api.users.$get({
      query: searchParams.toString() ? Object.fromEntries(searchParams) : undefined,
    })
    const result: ApiResponse<UserListResult> = await response.json()
    return result.data || { users: [], total: 0, page: 1, pageSize: 20 }
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.api.users[':id'].$get({
      param: { id },
    })
    const result: ApiResponse<User> = await response.json()
    if (!result.data) throw new Error(result.message || 'User not found')
    return result.data
  },

  // Delete user
  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.api.users[':id'].$delete({
      param: { id },
    })
    const result: ApiResponse<{ success: boolean }> = await response.json()
    return result.data || { success: false }
  },

  // Delete multiple users
  deleteUsers: async (ids: string[]): Promise<{ success: boolean }> => {
    const response = await apiClient.api.users['delete-batch'].$post({
      json: { ids },
    })
    const result: ApiResponse<{ success: boolean }> = await response.json()
    return result.data || { success: false }
  },
}
