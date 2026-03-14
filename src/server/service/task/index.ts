import { getContext, serviceContext } from "../context";
import { messageGenerations } from "../../db/schemas/chat";
import { eq, and, isNotNull } from "drizzle-orm";
import { aiService } from "../ai";
import { getProviderById } from "@/server/ai/provider";
import { fetchUrlToDataURI } from "../../lib/util";
import { saveFiles } from "../file/storage";

// Task processor for video generation
class TaskService {
	// Process pending video generation tasks
	async processVideoTasks() {
		// Check if service context is initialized
		if (!serviceContext) {
			// Service context not initialized, skip processing
			return;
		}

		const { db } = getContext();

		// Get all video generations that are in pending or generating state
		const pendingTasks = await db.query.messageGenerations.findMany({
			where: and(
				eq(messageGenerations.type, "video"),
				and(
					eq(messageGenerations.status, "pending"),
					eq(messageGenerations.taskId, null)
				)
			),
		});

		// Get all video generations that have a taskId but are still in generating state
		const generatingTasks = await db.query.messageGenerations.findMany({
			where: and(
				eq(messageGenerations.type, "video"),
				eq(messageGenerations.status, "generating"),
				isNotNull(messageGenerations.taskId)
			),
		});

		// Process pending tasks (start generation)
		for (const task of pendingTasks) {
			await this.processPendingTask(task);
		}

		// Process generating tasks (poll status)
		for (const task of generatingTasks) {
			await this.processGeneratingTask(task);
		}
	}

	// Process a pending video generation task
	private async processPendingTask(task: typeof messageGenerations.$inferSelect) {
		const { db } = getContext();

		try {
			// Get AI provider and model
			const { dbProvider, dbModel } = await aiService.getAiProviderAndModelById({
				providerId: task.provider,
				modelId: task.model,
			});

			if (!dbProvider || !dbModel) {
				throw new Error("Provider or model not found");
			}

			// Get provider instance
			const providerInstance = getProviderById(dbProvider.providerId);

			// Parse settings
			const settings: any = {};
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

			// Parse parameters
			const parameters: any = task.parameters ? JSON.parse(task.parameters) : {};

			// Start video generation
			const videoResult = await providerInstance.generateVideo(
				{
					providerId: dbProvider.providerId,
					modelId: dbModel.modelId,
					prompt: task.prompt,
					aspectRatio: parameters.aspectRatio,
					duration: parameters.duration || 5,
					model: dbModel.modelId,
				},
				settings as any,
			);

			if (videoResult.errorReason) {
				// Update task status to failed
				await db
					.update(messageGenerations)
					.set({
						status: "failed",
						errorReason: videoResult.errorReason,
						updatedAt: new Date(),
					})
					.where(eq(messageGenerations.id, task.id));
				return;
			}

			if (videoResult.taskId) {
				// Update task with taskId and set to generating
				await db
					.update(messageGenerations)
					.set({
						taskId: videoResult.taskId,
						status: "generating",
						updatedAt: new Date(),
					})
					.where(eq(messageGenerations.id, task.id));
			}
		} catch (error) {
			console.error("Error processing pending video task:", error);
			// Update task status to failed
			await db
				.update(messageGenerations)
				.set({
					status: "failed",
					errorReason: "UNKNOWN",
					updatedAt: new Date(),
				})
				.where(eq(messageGenerations.id, task.id));
		}
	}

	// Process a generating video generation task (poll status)
	private async processGeneratingTask(task: typeof messageGenerations.$inferSelect) {
		const { db } = getContext();

		try {
			// Get AI provider and model
			const { dbProvider, dbModel } = await aiService.getAiProviderAndModelById({
				providerId: task.provider,
				modelId: task.model,
			});

			if (!dbProvider || !dbModel) {
				throw new Error(`Provider or model not found for provider: ${task.provider}, model: ${task.model}`);
			}

			// Get provider instance
			const providerInstance = getProviderById(dbProvider.providerId);

			if (!providerInstance) {
				throw new Error(`Provider instance not found for providerId: ${dbProvider.providerId}`);
			}

			// Parse settings
			const settings: any = {};
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

			// Poll task status
			const videoResult = await providerInstance.pollVideoTask(
				task.taskId!,
				settings.apiKey!,
				settings.baseURL!,
			);

			if (!videoResult) {
				// Task is still in progress or failed
				// We'll check it again in the next cycle
				return;
			}

			// Task completed successfully
			if (videoResult.videoUrl) {
				// Download video from URL and save to files table
				try {
					const videoData = await fetchUrlToDataURI(videoResult.videoUrl, "mp4");
					const fileIds = await saveFiles([videoData], task.userId);
					
					// Save file IDs to database
					await db
						.update(messageGenerations)
						.set({
							status: "completed",
							fileIds: JSON.stringify(fileIds),
							generationTime: videoResult.generationTime || null,
							updatedAt: new Date(),
						})
						.where(eq(messageGenerations.id, task.id));
				} catch (error) {
					console.error("Error saving video file:", error);
					await db
						.update(messageGenerations)
						.set({
							status: "failed",
							errorReason: "FILE_SAVE_ERROR",
							updatedAt: new Date(),
						})
						.where(eq(messageGenerations.id, task.id));
				}
			} else if (videoResult.errorReason) {
				// Task failed
				await db
					.update(messageGenerations)
					.set({
						status: "failed",
						errorReason: videoResult.errorReason,
						updatedAt: new Date(),
					})
					.where(eq(messageGenerations.id, task.id));
			}
		} catch (error) {
			console.error("Error processing generating video task:", error);
			// Don't mark as failed yet - we'll try again in the next cycle
		}
	}
}

export const taskService = new TaskService();
