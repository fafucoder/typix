import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
import openai from "openai";
import type { AiProvider, ApiProviderSettings, ApiProviderSettingsItem } from "../types/provider";
import { type ProviderSettingsType, doParseSettings } from "../types/provider";
import type { TypixVideoGenerateRequest, TypixVideoApiResponse } from "../types/api";

// Convert DataURI base64 string to FsReadStream compatible format
function createImageStreamFromDataUri(dataUri: string) {
	// Extract MIME type and base64 data from DataURI
	const [mimeTypePart, base64Data] = dataUri.split(",");
	if (!base64Data || !mimeTypePart) {
		throw new Error("Invalid DataURI format");
	}

	// Extract file extension from MIME type (e.g., "data:image/png;base64" -> "png")
	const mimeTypeMatch = mimeTypePart.match(/data:image\/([^;]+)/);
	const extension = mimeTypeMatch ? mimeTypeMatch[1] : "png";

	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	const stream = {
		path: `image.${extension}`,
		async *[Symbol.asyncIterator]() {
			yield bytes;
		},
	};

	return stream;
}

const openAISettingsSchema = [
	{
		key: "apiKey",
		type: "password",
		required: true,
	},
	{
		key: "baseURL",
		type: "url",
		required: false,
		defaultValue: "https://api.openai.com/v1",
	},
	{
		key: "model",
		type: "string",
		required: false,
		defaultValue: "gpt-image-1",
	},
] as const satisfies ApiProviderSettingsItem[];

// Automatically generate type from schema
export type OpenAISettings = ProviderSettingsType<typeof openAISettingsSchema>;

const aspectRatioSizes = {
	"1:1": "1024x1024",
	"16:9": "1792x1024",
	"9:16": "1024x1792",
	"4:3": "1536x1024",
	"3:4": "1024x1536",
};

const OpenAI: AiProvider = {
	id: "openai",
	name: "OpenAI",
	supportCors: true,
	settings: openAISettingsSchema,

	parseSettings: <OpenAISettings>(settings: ApiProviderSettings) => {
		return doParseSettings(settings, openAISettingsSchema) as OpenAISettings;
	},
	generate: async (request, settings) => {
		const { baseURL, apiKey, model } = OpenAI.parseSettings<OpenAISettings>(settings);

		const client = new openai.OpenAI({ baseURL, apiKey, dangerouslyAllowBrowser: true });

		let generateResult: openai.ImagesResponse;
		let size: any = null;
		if (request.aspectRatio) {
			size = aspectRatioSizes[request.aspectRatio];
		}
		try {
			// Get ability from request.model
			const ability = request.model?.ability || "t2i";

			switch (ability) {
				case "t2i":
					// Text-to-image generation
					generateResult = await client.images.generate({
						model,
						prompt: request.prompt,
						n: request.n || 1,
						size,
					});
					break;
				default:
					// Image editing
					generateResult = await client.images.edit({
						model,
						image: createImageStreamFromDataUri(request.images![0]!),
						prompt: request.prompt,
						n: request.n || 1,
						size,
					});
					break;
			}
		} catch (e) {
			if (e instanceof openai.AuthenticationError || e instanceof openai.NotFoundError) {
				return {
					errorReason: "CONFIG_ERROR",
					images: [],
				};
			}
			throw e;
		}

		return {
			images: await Promise.all(
				(generateResult.data || []).map(async (image) => {
					if (image.b64_json) {
						return base64ToDataURI(image.b64_json);
					}
					if (image.url) {
						try {
							return await fetchUrlToDataURI(image.url);
						} catch (error) {
							console.error("OpenAI image fetch error:", error);
							return null;
						}
					}
					return undefined;
				}),
			).then((results) => results.filter(Boolean) as string[]),
		};
	},

	generateVideo: async (request: TypixVideoGenerateRequest, settings: ApiProviderSettings): Promise<TypixVideoApiResponse> => {
		const { baseURL, apiKey, model } = OpenAI.parseSettings<OpenAISettings>(settings);

		try {
			// OpenAI Sora video generation
			const videoModel = model || "sora";
			
			// Create video generation request
			const response = await fetch(`${baseURL}/videos/generations`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: videoModel,
					prompt: request.prompt,
					...(request.aspectRatio && { aspect_ratio: request.aspectRatio }),
					...(request.duration && { duration: request.duration }),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
				if (response.status === 401 || response.status === 403) {
					return {
						errorReason: "CONFIG_ERROR",
					};
				}
				if (response.status === 429) {
					return {
						errorReason: "TOO_MANY_REQUESTS",
					};
				}
				if (response.status === 400) {
					return {
						errorReason: "API_ERROR",
					};
				}
				throw new Error((errorData.message as string) || `HTTP error! status: ${response.status}`);
			}

			const result = await response.json() as { id: string };

			if (!result.id) {
				return {
					errorReason: "UNKNOWN",
				};
			}

			const videoUrl = await pollVideoTask(result.id, apiKey, baseURL || "https://api.openai.com/v1");

			if (videoUrl) {
				return {
					videoUrl,
					status: "completed",
				};
			}

			return {
				errorReason: "UNKNOWN",
			};
		} catch (error) {
			console.error("OpenAI video generation error:", error);
			return {
				errorReason: "UNKNOWN",
			};
		}
	},
};

async function pollVideoTask(taskId: string, apiKey: string, baseURL: string): Promise<string | null> {
	const maxAttempts = 120;
	const interval = 15000;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const response = await fetch(`${baseURL}/videos/generations/${taskId}`, {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				console.error(`Failed to poll video task status: ${response.status}`);
				await new Promise(resolve => setTimeout(resolve, interval));
				continue;
			}

			const result = await response.json() as {
				status: string;
				video_url?: string;
			};

			const taskStatus = result.status;

			if (taskStatus === "completed" && result.video_url) {
				return result.video_url;
			}

			if (taskStatus === "failed") {
				console.error("Video generation failed");
				return null;
			}

			if (taskStatus === "processing" || taskStatus === "pending") {
				await new Promise(resolve => setTimeout(resolve, interval));
				continue;
			}

			console.error("Unknown task status:", taskStatus);
			return null;
		} catch (error) {
			console.error("Error polling video task status:", error);
			await new Promise(resolve => setTimeout(resolve, interval));
		}
	}

	console.error("Video generation timed out");
	return null;
}

export default OpenAI;
