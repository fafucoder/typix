import { apiClient } from '../api-client'

export interface Chat {
  id: string
  title: string
  userId: string
  provider: string
  model: string
  type: string
  createdAt: string
  updatedAt: string
  deleted: number
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface Message {
  id: string
  chatId: string
  content: string
  role: 'user' | 'assistant'
  type: string
  createdAt: string
  updatedAt: string
  generation?: {
    id: string
    status: string
    fileIds?: string[]
    resultUrls?: string[]
    errorReason?: string
  }
}

export interface ChatListResult {
  chats: Chat[]
  total: number
  page: number
  pageSize: number
}

export interface ChatDetailResult {
  chat: Chat
  messages: Message[]
}

export interface ChatListParams {
  page?: number
  pageSize?: number
  search?: string
  userName?: string
}

export const chatService = {
  getChats: async (params: ChatListParams): Promise<ChatListResult> => {
    const response = await apiClient.api.chats.$get({
      query: params,
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '获取聊天列表失败')
    }
    return result.data as any
  },

  getChatById: async (id: string): Promise<ChatDetailResult> => {
    const response = await apiClient.api.chats[':id'].$get({
      param: { id },
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '获取聊天详情失败')
    }
    return result.data as any
  },

  deleteChat: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.api.chats[':id'].$delete({
      param: { id },
    })
    const result = await response.json()
    if (result.code !== 'ok' || !('data' in result) || !result.data) {
      throw new Error(result.message || '删除聊天失败')
    }
    return result.data
  },
}
