import { getProviderById } from "@/server/ai/provider";
import { type ApiProviderSettings, ConfigInvalidError } from "@/server/ai/types/provider";
import type { AiModel,Ability } from "@/server/ai/types/model";
import { chats, messageAttachments, messageGenerations, messages } from "@/server/db/schemas";
import { createSchemaOmits } from "@/server/db/util";
import { inBrowser, inCfWorker } from "@/server/lib/env";
import { ServiceException } from "@/server/lib/exception";
import { and, desc, eq, ne, sql, asc } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod/v4";
import { customAlphabet } from "nanoid/non-secure";
import { aiService } from "../ai";
import { type RequestContext, getContext } from "../context";
import { getFileData, getFileUrl, saveFiles } from "../file/storage";
import { fetchUrlToDataURI } from "../../lib/util";

export const CreateChatSchema = createInsertSchema(chats)
	.pick({
		title: true,
		provider: true,
		model: true,
		type: true,
	})
	.extend({
		content: z.string().optional(),
		/**
		 * Number of images to generate
		 */
		imageCount: z.number().int().min(1).max(10).default(1),
		/**
		 * Aspect ratio for image generation
		 */
		aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
		/**
		 * Attachments for the first message
		 */
		attachments: z
			.array(
				z.object({
					data: z.string(), // base64 data
					type: z.enum(["image"]).default("image"),
				}),
			)
			.optional(),
		/**
		 * @deprecated Use attachments instead
		 * Data URI (base64) images
		 */
		images: z.array(z.string()).optional(),
	});
export type CreateChat = z.infer<typeof CreateChatSchema>;
const createChat = async (req: CreateChat, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const chatId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

	await db
		.insert(chats)
		.values({
			id: chatId,
			userId,
			title: req.title,
			provider: req.provider,
			model: req.model,
			type: req.type,
		});

	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, chatId),
	});

	if (req.content) {
		const messageResult = await createMessage(
			{
				chatId: chat!.id,
				content: req.content,
				type: "text",
				provider: req.provider,
				model: req.model,
				imageCount: req.imageCount, // Pass the image count
				aspectRatio: req.aspectRatio, // Pass the aspect ratio
				attachments: req.attachments,
				images: req.images,
			},
			ctx,
		);

		// Return chat id and messages for frontend to trigger generation
		return { id: chat!.id, messages: messageResult.messages };
	}

	return { id: chat!.id };
};

const getChats = async (req: { type?: "text2image" | "text2video" }, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	// Get user chats filtered by type if provided
	const userChats = await db.query.chats.findMany({
		where: and(
			eq(chats.userId, userId),
			eq(chats.deleted, 0),
			req.type ? eq(chats.type, req.type) : undefined,
		),
		orderBy: [desc(chats.createdAt)],
	});

	return userChats;
};

export const GetChatByIdSchema = z.object({
	id: z.string(),
});
export type GetChatById = z.infer<typeof GetChatByIdSchema>;
const getChatById = async (req: GetChatById, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, req.id), eq(chats.userId, userId), eq(chats.deleted, 0)),
		with: {
			messages: {
				orderBy: [
					messages.createdAt,
					sql`CASE WHEN ${messages.role} = 'user' THEN 0 ELSE 1 END`,
					messages.id,
				],
				with: {
					generation: true,
					attachments: {
						with: {
							file: true,
						},
					},
				},
			},
		},
	});

	if (!chat || chat.userId !== userId) {
		return null;
	}

	const chatMessages = await Promise.all(
		chat.messages.map(async (msg) => {
			// Parse fileIds from JSON string or plain string
			let fileIds: string[] | null = null;
			if (msg.generation?.fileIds) {
				try {
					const parsed = JSON.parse(msg.generation.fileIds);
					fileIds = Array.isArray(parsed) ? parsed : [parsed];
				} catch {
					// If JSON parse fails, treat it as a single file ID
					fileIds = [msg.generation.fileIds];
				}
			}

			// Process attachments for user messages
			const attachmentUrls = msg.attachments
				? await Promise.all(
						msg.attachments.map(async (attachment) => {
							const url = await getFileUrl(attachment.fileId, userId);
							console.log(`[ChatService] Attachment ${attachment.id} fileId=${attachment.fileId}, url=${url}`);
							return {
								id: attachment.id,
								type: attachment.type,
								url,
							};
						}),
					)
				: [];

			return {
				...msg,
				attachments: attachmentUrls,
				generation: msg.generation
					? {
							...msg.generation,
							...(fileIds
								? {
										resultUrls: await Promise.all(
											fileIds!.map(async (fileId) => {
												return await getFileUrl(fileId, userId);
											}),
										),
									}
								: null),
						}
					: null,
			};
		}),
	);

	return {
		...chat,
		messages: chatMessages,
	};
};

export const DeleteChatSchema = z.object({
	id: z.string(),
});
export type DeleteChat = z.infer<typeof DeleteChatSchema>;
const deleteChat = async (req: DeleteChat, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, req.id),
	});

	if (!chat || chat.userId !== userId) {
		return false;
	}

	await getContext().db.update(chats).set({ deleted: true }).where(eq(chats.id, req.id));

	return true;
};

export const UpdateChatSchema = createUpdateSchema(chats)
	.pick({
		id: true,
		provider: true,
		model: true,
		title: true,
	})
	.extend({
		id: z.string().nonempty(),
	});
export type UpdateChat = z.infer<typeof UpdateChatSchema>;
const updateChat = async (req: UpdateChat, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, req.id),
	});

	if (!chat || chat.userId !== userId) {
		throw new ServiceException("not_found", "Chat not found");
	}

	// Validate provider and model if provided
	if (req.provider && req.model) {
		const { dbModel } = await aiService.getAiProviderAndModelById({ providerId: req.provider, modelId: req.model }, ctx);
		if (!dbModel) {
			throw new ServiceException("invalid_parameter", "Model not found for the specified provider");
		}
	}

	await getContext()
		.db.update(chats)
		.set({
			...(req.provider && { provider: req.provider }),
			...(req.model && { model: req.model }),
			...(req.title && { title: req.title }),
		})
		.where(eq(chats.id, req.id));

	return true;
};

export const DeleteMessageSchema = z.object({
	messageId: z.string().nonempty(),
});
export type DeleteMessage = z.infer<typeof DeleteMessageSchema>;
const deleteMessage = async (req: DeleteMessage, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	// Find the message and verify ownership
	const message = await db.query.messages.findFirst({
		where: eq(messages.id, req.messageId),
		with: {
			chat: true,
			generation: true,
			attachments: true, // Include attachments for cleanup
		},
	});

	if (!message || message.chat.userId !== userId) {
		throw new ServiceException("not_found", "Message not found");
	}

	// Delete message attachments (this should cascade delete via foreign key constraints)
	if (message.attachments && message.attachments.length > 0) {
		await db.delete(messageAttachments).where(eq(messageAttachments.messageId, req.messageId));
	}

	// Delete the message (this should cascade delete associated generation via foreign key constraint)
	await db.delete(messages).where(eq(messages.id, req.messageId));

	// Update chat timestamp
	await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, message.chatId));

	return true;
};

export const CreateMessageSchema = createInsertSchema(messages)
	.omit(createSchemaOmits)
	.pick({
		chatId: true,
		content: true,
		type: true,
	})
	.extend({
		provider: z.string(),
		model: z.string(),
		/**
		 * Number of images to generate
		 */
		imageCount: z.number().int().min(1).max(10).default(1),
		/**
		 * Aspect ratio for image generation
		 */
		aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
		/**
		 * base64-encoded image strings for attachments
		 */
		attachments: z
			.array(
				z.object({
					data: z.string(), // base64 data
					type: z.enum(["image"]).default("image"),
				}),
			)
			.optional(),
		/**
		 * @deprecated Use attachments instead
		 * base64-encoded image strings
		 */
		images: z.array(z.string()).optional(),
	});
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
type CreateMessageResponse = Pick<NonNullable<Awaited<ReturnType<typeof getChatById>>>, "messages">;

// Common generation logic
interface GenerationParams {
	generationId: string;
	prompt: string;
	provider: string;
	model: string;
	chatId: string;
	userId: string;
	userImages?: string[];
	imageCount?: number; // Number of images to generate
	aspectRatio?: string; // Aspect ratio for image generation
	duration?: number; // Duration for video generation
	messageId?: string; // For regeneration, exclude this message from reference search
}

const executeGeneration = async (params: GenerationParams, ctx: RequestContext) => {
	const { db } = getContext();
	const {
		generationId,
		prompt,
		provider: providerId,
		model: modelId,
		chatId,
		userId,
		userImages,
		imageCount,
		aspectRatio,
		duration,
		messageId,
	} = params;

	try {
		const providerInstance = getProviderById(providerId);
		
		// Get ai_provider and specific ai_model from aiService
		const { dbProvider, dbModel } = await aiService.getAiProviderAndModelById({ providerId, modelId }, ctx);
		
		// Validate model exists
		if (!dbModel) {
			throw new ServiceException("not_found", `Model ${modelId} not found for provider ${providerId}`);
		}
		
		// Build settings from database fields
		const settings: ApiProviderSettings = {};
		
		// Merge from ai_providers.settings field
		if (dbProvider.settings) {
			try {
				const dbSettingsArray = JSON.parse(dbProvider.settings) as any[];
				dbSettingsArray.forEach(setting => {
					const value = setting.value ?? setting.defaultValue;
					if (value !== undefined && setting.key) {
						settings[setting.key] = value;
					}
				});
			} catch (e) {
				console.warn('[AI DB Config] Failed to parse dbProvider.settings:', e);
			}
		}
		
		// Merge from endpoints and secretKey (higher priority)
		if (dbProvider.endpoints) {
			settings.endpoint = dbProvider.endpoints;
			settings.baseURL = dbProvider.endpoints;
		}
		if (dbProvider.secretKey) {
			settings.apiKey = dbProvider.secretKey;
		}
		
		if (dbModel.type === "text2video" && dbModel.ability !== "t2v") {
			dbModel.ability = "t2v";
		}

		// Debug log: Print configuration from database
		console.log(`[AI DB Config] Provider: ${providerId}`);
		console.log(`[AI DB Config] Endpoints: ${dbProvider.endpoints}`);
		console.log(`[AI DB Config] SecretKey: ${dbProvider.secretKey ? '***' : 'Not set'}`);
		console.log(`[AI DB Config] Final settings:`, settings);
		

		// Build model object that conforms to AiModel interface
		const model: AiModel = {
			id: dbModel.modelId,
			name: dbModel.modelId,
			ability: dbModel.ability as Ability || "t2i",
			supportedAspectRatios: dbModel.supportedAspectRatios,
			enabled: dbModel.enabled === 1,
			maxInputImages: dbModel.maxInputImages ?? undefined,
		};
		
		// Debug log: Print model information
		console.log(`[AI DB Config] Model from DB:`, dbModel);
		console.log(`[AI DB Config] Built model:`, model);
		let referImages: string[] | undefined;

		// Always use user uploaded images if provided
		if (userImages && userImages.length > 0) {
			referImages = userImages;
		} else if (model.ability !== "t2i") {
			// If no user images and model supports image edit, refer to last message's images
			const lastMessageImage = async () => {
				const whereConditions = [
					eq(messages.chatId, chatId),
					eq(messages.role, "assistant"),
					eq(messages.type, "image"),
				];

				// Exclude the current message being regenerated
				if (messageId) {
					whereConditions.push(ne(messages.id, messageId));
				}

				const lastMessage = await db.query.messages.findFirst({
					where: and(...whereConditions),
					orderBy: [desc(messages.createdAt)],
					with: {
						generation: {
							columns: {
								fileIds: true,
							},
						},
					},
				});
				const fileIds = lastMessage?.generation?.fileIds as string[] | null;
				if (fileIds && fileIds.length > 0) {
					switch (model.ability) {
						case "i2i": {
							// For i2i models, use appropriate number of images based on maxInputImages
							const maxImages = model.maxInputImages || 1;
							if (maxImages === 1) {
								// For single image edit, use the last image
								return [await getFileData(fileIds[fileIds.length - 1]!, userId)].filter(Boolean) as string[];
							}
							// For multi image edit, use all images up to the limit
							const imagesToUse = fileIds.slice(-maxImages);
							return (await Promise.all(imagesToUse.map((id) => getFileData(id, userId)))).filter(Boolean) as string[];
						}
					}
				}
			};

			referImages = await lastMessageImage();
		}

		const now = new Date();
		
		// Determine which generation method to use based on model type
		if (dbModel.type === "text2video") {
			// Video generation
			console.log(`[ChatService] Starting video generation for model ${modelId}`);
			
			const videoResult = await providerInstance.generateVideo(
				{
					providerId,
					modelId,
					prompt,
					aspectRatio: aspectRatio as any,
					duration: duration || 5,
					model: model,
				},
				settings,
			);
			
			if (videoResult.errorReason) {
				await db
					.update(messageGenerations)
					.set({
						status: "failed",
						errorReason: videoResult.errorReason,
						updatedAt: now,
					})
					.where(eq(messageGenerations.id, generationId));
				return;
			}

			if (videoResult.taskId) {
				// Store task ID and set status to generating
				await db
					.update(messageGenerations)
					.set({
						taskId: videoResult.taskId,
						status: "generating",
						updatedAt: now,
					})
					.where(eq(messageGenerations.id, generationId));
			} else if (videoResult.videoUrl) {
				// Download video from URL and save to files table
				try {
					const videoData = await fetchUrlToDataURI(videoResult.videoUrl, "mp4");
					const fileIds = await saveFiles([videoData], userId);
					
					// Save file IDs to database
					await db
						.update(messageGenerations)
						.set({
							status: "completed",
							fileIds: JSON.stringify(fileIds),
							generationTime: Date.now() - now.getTime(),
							updatedAt: now,
						})
						.where(eq(messageGenerations.id, generationId));
				} catch (error) {
					console.error("Error saving video file:", error);
					await db
						.update(messageGenerations)
						.set({
							status: "failed",
							errorReason: "FILE_SAVE_ERROR",
							updatedAt: now,
						})
						.where(eq(messageGenerations.id, generationId));
				}
			}
		} else {
			// Image generation
			console.log(`[ChatService] Starting image generation for model ${modelId}`);
			
			const imageResult = await providerInstance.generate(
				{
					providerId,
					modelId,
					prompt,
					images: referImages,
					n: imageCount || 1, // Pass the image count to provider
					aspectRatio: aspectRatio as any, // Pass the aspect ratio to provider
					model: model,
				},
				settings,
			);
			
			if (imageResult.errorReason) {
				await db
					.update(messageGenerations)
					.set({
						status: "failed",
						errorReason: imageResult.errorReason,
						updatedAt: now,
					})
					.where(eq(messageGenerations.id, generationId));
				return;
			}

			// Save generated files to database
			const fileIds = await saveFiles(imageResult.images, userId);
			// Update generation with result URLs
			await db
				.update(messageGenerations)
			.set({
				status: "completed",
				fileIds,
				generationTime: Date.now() - now.getTime(),
				updatedAt: now,
			})
			.where(eq(messageGenerations.id, generationId));
		}
	} catch (error) {
		console.error("Error generating content:", error);
		await db
			.update(messageGenerations)
			.set({
				status: "failed",
				errorReason: error instanceof ConfigInvalidError ? "CONFIG_INVALID" : "UNKNOWN",
				updatedAt: new Date(),
			})
			.where(eq(messageGenerations.id, generationId));
		return;
	}
};

const createMessage = async (req: CreateMessage, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	// Verify chat exists and belongs to user
	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, req.chatId),
	});

	if (!chat || chat.userId !== userId) {
		throw new ServiceException("not_found", "Chat not found");
	}

	// Generate user message ID
	const userMessageId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

	// Add user message
	await db
		.insert(messages)
		.values({
			id: userMessageId,
			userId,
			chatId: req.chatId,
			content: req.content,
			role: "user",
			type: req.type,
		});

	const userMessage = await db.query.messages.findFirst({
		where: eq(messages.id, userMessageId),
	});

	if (!userMessage) {
		throw new ServiceException("error", "Failed to create user message");
	}

	// Handle attachments if provided
	const attachmentResults: Array<{ id: string; type: "image"; url: string | null }> = [];
	if (req.attachments && req.attachments.length > 0) {
		// Save attachment files
		const attachmentFileIds = await saveFiles(
			req.attachments.map((att) => att.data),
			userId,
		);

		// Create attachment records and prepare results
		for (let i = 0; i < req.attachments.length; i++) {
			const attachment = req.attachments[i];
			const fileId = attachmentFileIds[i];
			if (fileId && attachment) {
				await db.insert(messageAttachments).values({
					messageId: userMessage.id,
					fileId: fileId,
					type: attachment.type,
				});

				// Prepare attachment result for response
				const fileUrl = await getFileUrl(fileId, userId);
				attachmentResults.push({
					id: `${userMessage.id}-${i}`,
					type: "image",
					url: fileUrl,
				});
			}
		}
	}

	// Update chat timestamp
	await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, req.chatId));

	// Generate generation ID
	const generationId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

	// Determine generation type based on chat type
	const generationType = chat.type === "text2video" ? "video" : "image";

	// Create generation record
	await db
		.insert(messageGenerations)
		.values({
			id: generationId,
			userId,
			prompt: req.content,
			provider: req.provider,
			model: req.model,
			type: generationType,
			status: "pending",
			parameters: JSON.stringify({
				imageCount: req.imageCount,
				aspectRatio: req.aspectRatio,
			}),
		});

	const generation = await db.query.messageGenerations.findFirst({
		where: eq(messageGenerations.id, generationId),
	});

	// Generate assistant message ID
	const assistantMessageId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)();

	// Add assistant message
	await db
		.insert(messages)
		.values({
			id: assistantMessageId,
			userId,
			chatId: req.chatId,
			content: "",
			role: "assistant",
			type: generationType,
			generationId: generation!.id,
		});

	const assistantMessage = await db.query.messages.findFirst({
		where: eq(messages.id, assistantMessageId),
	});

	if (!assistantMessage) {
		throw new ServiceException("error", "Failed to create assistant message");
	}

	// Don't execute image generation here - client will call createMessageGenerate
	// This avoids CF Worker 30-second timeout limitation

	return {
		messages: [
			{
				...userMessage,
				generation: null,
				// Include attachments for immediate display
				attachments: attachmentResults,
			},
			{ ...assistantMessage, generation: generation!, attachments: [] },
		],
	} satisfies CreateMessageResponse;
};

export const GetGenerationStatusSchema = z.object({
	generationId: z.string(),
});
export type GetGenerationStatus = z.infer<typeof GetGenerationStatusSchema>;
const getGenerationStatus = async (req: GetGenerationStatus, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const generation = await db.query.messageGenerations.findFirst({
		where: eq(messageGenerations.id, req.generationId),
	});

	if (!generation || generation.userId !== userId) {
		return null;
	}

	// Check if generation is still pending/generating but has exceeded 5 minutes
	if (generation.status === "pending" || generation.status === "generating") {
		const lastGenTime = new Date(generation.updatedAt);
		const now = new Date();
		const elapsedMinutes = (now.getTime() - lastGenTime.getTime()) / 1000 / 60;

		if (elapsedMinutes > 5) {
			// Mark as failed due to timeout
			type UpdateGeneration = Pick<typeof generation, "status" | "errorReason" | "updatedAt">;
		const updateData = {
				status: "failed",
				errorReason: "TIMEOUT",
				updatedAt: now,
			} as UpdateGeneration;
		await db.update(messageGenerations).set(updateData).where(eq(messageGenerations.id, req.generationId));

		return {
				...generation,
				...updateData,
				resultUrls: undefined,
			};
		}
	}

	// Parse fileIds from JSON string or plain string
	let fileIds: string[] | null = null;
	if (generation.fileIds) {
		try {
			const parsed = JSON.parse(generation.fileIds);
			fileIds = Array.isArray(parsed) ? parsed : [parsed];
		} catch {
			// If JSON parse fails, treat it as a single file ID
			fileIds = [generation.fileIds];
		}
	}

	return {
		...generation,
		resultUrls: fileIds
			? await Promise.all(
					fileIds.map(async (fileId) => {
						return await getFileUrl(fileId, userId);
					}),
				)
			: undefined,
	};
};

export const CreateMessageGenerateSchema = z.object({
	generationId: z.string(),
});
export type CreateMessageGenerate = z.infer<typeof CreateMessageGenerateSchema>;
const createMessageGenerate = async (req: CreateMessageGenerate, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	// Find the generation record
	const generation = await db.query.messageGenerations.findFirst({
		where: eq(messageGenerations.id, req.generationId),
	});

	if (!generation || generation.userId !== userId) {
		throw new ServiceException("not_found", "Generation not found");
	}

	// Find the message associated with this generation
	const message = await db.query.messages.findFirst({
		where: eq(messages.generationId, req.generationId),
		with: {
			chat: true,
			attachments: {
				with: {
					file: true,
				},
			},
		},
	});

	if (!message || message.userId !== userId) {
		throw new ServiceException("not_found", "Message not found");
	}

	// Get user images from the parent user message (previous message in chat)
	const userMessage = await db.query.messages.findFirst({
		where: and(eq(messages.chatId, message.chatId), eq(messages.role, "user"), eq(messages.type, "text")),
		orderBy: [desc(messages.createdAt)],
		with: {
			attachments: {
				with: {
					file: true,
				},
			},
		},
	});

	const userImages = userMessage?.attachments.length
		? await Promise.all(userMessage.attachments.map(async (att) => await getFileData(att.fileId, userId)))
		: undefined;

	// Extract parameters from generation record
	const params = generation.parameters as any;
	const imageCount = params?.imageCount || 1;
	const aspectRatio = params?.aspectRatio;

	// Execute generation based on model type
	await executeGeneration(
		{
			generationId: generation.id,
			prompt: generation.prompt,
			provider: generation.provider,
			model: generation.model,
			chatId: message.chatId,
			userId,
			userImages: userImages?.filter(Boolean) as string[] | undefined,
			imageCount,
			aspectRatio,
			messageId: message.id,
		},
		ctx,
	);

	return { success: true };
};

export const RegenerateMessageSchema = z.object({
	messageId: z.string(),
});
export type RegenerateMessage = z.infer<typeof RegenerateMessageSchema>;
const regenerateMessage = async (req: RegenerateMessage, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	// Find the message to regenerate
	const message = await db.query.messages.findFirst({
		where: eq(messages.id, req.messageId),
		with: {
			generation: true,
			chat: true,
		},
	});

	if (!message || message.userId !== userId || message.role !== "assistant") {
		throw new ServiceException("not_found", "Message not found or not regeneratable");
	}

	if (!message.generation) {
		throw new ServiceException("invalid_parameter", "Message has no generation to regenerate");
	}

	const originalGeneration = message.generation;
	const chat = message.chat;

	if (!chat) {
		throw new ServiceException("not_found", "Chat not found");
	}

	// Reset the existing generation record to pending status
	await db
		.update(messageGenerations)
		.set({
			status: "pending",
			fileIds: null, // Clear previous results
			errorReason: null, // Clear previous errors
			generationTime: null, // Clear previous timing
			updatedAt: new Date(),
		})
		.where(eq(messageGenerations.id, originalGeneration.id));

	// Reset message content while regenerating
	await db
		.update(messages)
		.set({
			content: "", // Reset content while regenerating
		})
		.where(eq(messages.id, req.messageId));

	// Update chat timestamp
	await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chat.id));

	// Don't execute image generation here - client will call createMessageGenerate
	// This avoids CF Worker 30-second timeout limitation

	return {
		messageId: req.messageId,
		generationId: originalGeneration.id, // Return the existing generation ID
	};
};

class ChatService {
	createChat = createChat;
	getChats = getChats;
	getChatById = getChatById;
	deleteChat = deleteChat;
	updateChat = updateChat;
	createMessage = createMessage;
	deleteMessage = deleteMessage;
	getGenerationStatus = getGenerationStatus;
	createMessageGenerate = createMessageGenerate;
	regenerateMessage = regenerateMessage;
}

export const chatService = new ChatService();
