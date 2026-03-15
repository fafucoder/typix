import { eq, like, or, and, desc, sql } from "drizzle-orm";
import { getContext } from "./context";
import { chats, messages, messageGenerations } from "@/admin/db/schemas/chat";
import { user } from "@/admin/db/schemas/auth";
import { files } from "@/admin/db/schemas/file";

export interface Chat {
	id: string;
	title: string;
	userId: string;
	provider: string;
	model: string;
	createdAt: string;
	updatedAt: string;
	user?: { id: string; name: string; email: string };
}

export interface Message {
	id: string;
	chatId: string;
	content: string;
	role: "user" | "assistant";
	type: "text" | "image";
	createdAt: string;
	updatedAt: string;
	generation?: {
		id: string;
		status: string;
		fileIds?: string[];
		errorReason?: string;
	};
}

export interface ChatListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	userName?: string;
}

export interface ChatListResult {
	chats: Chat[];
	total: number;
	page: number;
	pageSize: number;
}

export const chatService = {
	getChats: async (params: ChatListParams = {}): Promise<{ success: boolean; data?: ChatListResult; error?: string }> => {
		const { db } = getContext();
		const { page = 1, pageSize = 20, search, userName } = params;

		try {
			const offset = (page - 1) * pageSize;

			let userIds: string[] = [];
			if (userName) {
				const users = await db.select({ id: user.id }).from(user).where(like(user.name, `%${userName}%`));
				userIds = users.map(u => u.id);
			}

			const conditions = [];
			if (userIds.length > 0) {
				const userIdConditions = userIds.map((id) => eq(chats.userId, id));
				conditions.push(or(...userIdConditions));
			}
			if (search) {
				conditions.push(like(chats.title, `%${search}%`));
			}

			const chatResults = await db
				.select()
				.from(chats)
				.where(conditions.length > 0 ? or(...conditions) : undefined)
				.orderBy(desc(chats.createdAt))
				.limit(pageSize)
				.offset(offset);

			const countResult = await db
				.select({ count: chats.id })
				.from(chats)
				.where(conditions.length > 0 ? or(...conditions) : undefined);
			const total = countResult.length;

			const relatedUserIds = [...new Set(chatResults.map(c => c.userId))];

			const usersResult = relatedUserIds.length > 0
				? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, relatedUserIds[0]))
				: [];

			const userMap = new Map(usersResult.map(u => [u.id, u]));

			for (let i = 1; i < relatedUserIds.length; i++) {
				const u = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, relatedUserIds[i])).limit(1);
				if (u.length > 0) userMap.set(u[0].id, u[0]);
			}

			const formattedChats: Chat[] = chatResults.map((row) => ({
				id: row.id,
				title: row.title,
				userId: row.userId,
				provider: row.provider,
				model: row.model,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
				user: userMap.get(row.userId),
			}));

			return {
				success: true,
				data: {
					chats: formattedChats,
					total,
					page,
					pageSize,
				},
			};
		} catch (error) {
			console.error("Get chats error:", error);
			return { success: false, error: "Failed to get chats" };
		}
	},

	getChatById: async (id: string): Promise<{ success: boolean; chat?: Chat; messages?: Message[]; error?: string }> => {
		const { db } = getContext();

		try {
			const chatResults = await db.select().from(chats).where(eq(chats.id, id)).limit(1);

			if (chatResults.length === 0) {
				return { success: false, error: "Chat not found" };
			}

			const chatRow = chatResults[0];
			const userResults = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, chatRow.userId)).limit(1);

			const formattedChat: Chat = {
				id: chatRow.id,
				title: chatRow.title,
				userId: chatRow.userId,
				provider: chatRow.provider,
				model: chatRow.model,
				createdAt: chatRow.createdAt.toISOString(),
				updatedAt: chatRow.updatedAt.toISOString(),
				user: userResults.length > 0 ? userResults[0] : undefined,
			};

			const messageResults = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(desc(messages.createdAt));

			const generationIds = messageResults.filter(m => m.generationId).map(m => m.generationId!);
			const generationResults = generationIds.length > 0
				? await db.select().from(messageGenerations).where(eq(messageGenerations.id, generationIds[0]))
				: [];

			const generationMap = new Map(generationResults.map(g => [g.id, g]));
			for (let i = 1; i < generationIds.length; i++) {
				const g = await db.select().from(messageGenerations).where(eq(messageGenerations.id, generationIds[i])).limit(1);
				if (g.length > 0) generationMap.set(g[0].id, g[0]);
			}

			const formattedMessages: Message[] = messageResults.map((row) => {
				const generation = row.generationId ? generationMap.get(row.generationId) : undefined;
				return {
					id: row.id,
					chatId: row.chatId,
					content: row.content,
					role: row.role,
					type: row.type,
					createdAt: row.createdAt.toISOString(),
					updatedAt: row.updatedAt.toISOString(),
					generation: generation ? {
						id: generation.id,
						status: generation.status,
						fileIds: (() => {
							try {
								return generation.fileIds ? JSON.parse(generation.fileIds) : undefined;
							} catch (e) {
								console.error("Failed to parse fileIds:", e);
								return undefined;
							}
						})(),
						errorReason: generation.errorReason,
					} : undefined,
				};
			});

			return { success: true, chat: formattedChat, messages: formattedMessages };
		} catch (error) {
			console.error("Get chat error:", error);
			return { success: false, error: "Failed to get chat" };
		}
	},

	deleteChat: async (id: string): Promise<{ success: boolean; error?: string }> => {
		const { db } = getContext();

		try {
			const existing = await db.select().from(chats).where(eq(chats.id, id)).limit(1);

			if (existing.length === 0) {
				return { success: false, error: "Chat not found" };
			}

			await db.delete(chats).where(eq(chats.id, id));

			return { success: true };
		} catch (error) {
			console.error("Delete chat error:", error);
			return { success: false, error: "Failed to delete chat" };
		}
	},
};
