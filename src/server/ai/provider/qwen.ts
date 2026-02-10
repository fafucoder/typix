import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
import { GenError } from "@/server/lib/types";
import type {
	AiProvider,
	ApiProviderSettings,
	ApiProviderSettingsItem,
} from "../types/provider";
import {
	type ProviderSettingsType,
	chooseAblility,
	doParseSettings,
	findModel,
} from "../types/provider";

const qwenSettingsSchema = [
	{
		key: "apiKey",
		type: "password",
		required: true,
	},
	{
		key: "baseURL",
		type: "url",
		required: false,
		defaultValue: "https://dashscope.aliyuncs.com/api/v1",
	},
] as const satisfies ApiProviderSettingsItem[];

export type QwenSettings = ProviderSettingsType<typeof qwenSettingsSchema>;

const aspectRatioSizes = {
	"1:1": "1024*1024",
	"16:9": "1792*1024",
	"9:16": "1024*1792",
	"4:3": "1536*1024",
	"3:4": "1024*1536",
};

const Qwen: AiProvider = {
	id: "qwen",
	name: "Qwen",
	supportCors: false,
	enabledByDefault: true,
	settings: qwenSettingsSchema,
	models: [
		{
			id: "qwen-image",
			name: "Qwen Image",
			ability: "i2i",
			maxInputImages: 3,
			enabledByDefault: true,
			supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
		},
		{
			id: "qwen-image-max",
			name: "Qwen Image Max",
			ability: "t2i",
			maxInputImages: 0,
			enabledByDefault: true,
			supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
		}
	],
	parseSettings: <QwenSettings>(settings: ApiProviderSettings) => {
		return doParseSettings(settings, qwenSettingsSchema) as QwenSettings;
	},
	generate: async (request, settings) => {
		try {
			const { baseURL, apiKey } = Qwen.parseSettings<QwenSettings>(settings);
			const model = request.modelId;
			const size = request.aspectRatio ? aspectRatioSizes[request.aspectRatio] : "1024*1024";
			const requestBody = {
				model,
				input: {
					messages: [
						{
							role: "user",
							content: [
								{
									text: request.prompt
								}
							]
						}
					]
				},
				parameters: {
					watermark: false,
					size
				}
			};

			const url = `${baseURL}/services/aigc/multimodal-generation/generation`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorText = await response.text();
				if (response.status === 401 || response.status === 404) {
					throw new GenError("CONFIG_ERROR");
				}
				if (response.status === 429) {
					throw new GenError("TOO_MANY_REQUESTS");
				}
				if (response.status === 400) {
					const errorResp = JSON.parse(errorText);
					if (errorResp.code === "InvalidParameter") {
						throw new GenError("PROMPT_FLAGGED");
					}
				}
				throw new Error(`Qwen API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const generateResult = await response.json() as any;

			let imageData: any[] = [];
			if (generateResult.output && generateResult.output.choices && Array.isArray(generateResult.output.choices)) {
				imageData = generateResult.output.choices;
			} else if (generateResult.output && generateResult.output.images) {
				imageData = generateResult.output.images;
			} else if (generateResult.data && Array.isArray(generateResult.data)) {
				imageData = generateResult.data;
			} else if (generateResult.images && Array.isArray(generateResult.images)) {
				imageData = generateResult.images;
			}

			const images = await Promise.all(
				imageData.map(async (image: any) => {
					// Handle choices format (阿里Qwen API)
					if (image.message && image.message.content) {
						const content = image.message.content;
						for (const item of content) {
							if (item.image) {
								if (item.image.startsWith('http')) {
									// Handle image URL
									try {
										return await fetchUrlToDataURI(item.image);
									} catch (error) {
										console.error("Qwen image fetch error:", error);
										return null;
									}
								} else {
									// Handle base64 image
									return base64ToDataURI(item.image);
								}
							}
							if (item.image_url) {
								try {
									return await fetchUrlToDataURI(item.image_url);
								} catch (error) {
									console.error("Qwen image fetch error:", error);
									return null;
								}
							}
						}
					}
					// Handle direct image formats
					if (image.b64_json) {
						return base64ToDataURI(image.b64_json);
					}
					if (image.url) {
						try {
							return await fetchUrlToDataURI(image.url);
						} catch (error) {
							console.error("Qwen image fetch error:", error);
							return null;
						}
					}
					if (image.image_url) {
						try {
							return await fetchUrlToDataURI(image.image_url);
						} catch (error) {
							console.error("Qwen image fetch error:", error);
							return null;
						}
					}
					if (image.base64) {
						return base64ToDataURI(image.base64);
					}
					return undefined;
				})
			);

			return {
				images: images.filter(Boolean) as string[],
			};
		} catch (error: any) {
			if (error instanceof GenError) {
				return {
					errorReason: error.reason,
					images: [],
				};
			}
			throw error;
		}
	},
};

export default Qwen;