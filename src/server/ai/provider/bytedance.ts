import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
import type { AiProvider, ApiProviderSettings, ApiProviderSettingsItem} from "../types/provider";
import { type ProviderSettingsType, doParseSettings } from "../types/provider";
import type { TypixVideoGenerateRequest, TypixVideoApiResponse } from "../types/api";

const defaultBaseURL = "https://ark.cn-beijing.volces.com/api/v3";

// ByteDance Settings Schema
const volcengineSettingsSchema = [
  {
    key: "apiKey",
    type: "password",
    required: true,
  },
  {
    key: "baseURL",
    type: "url",
    required: false,
    defaultValue: defaultBaseURL,
  },
] as const satisfies ApiProviderSettingsItem[];

export type VolcengineSettings = ProviderSettingsType<typeof volcengineSettingsSchema>;

const aspectRatioSizes = {
  "1:1": "2048x2048",
  "16:9": "2560x1440",
  "9:16": "1440x2560",
  "4:3": "2304x1728",
  "3:4": "1728x2304",
};

// ByteDance Provider
const ByteDance: AiProvider = {
  id: "bytedance",
  name: "ByteDance",
  supportCors: false,
  settings: volcengineSettingsSchema,

  parseSettings: <VolcengineSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, volcengineSettingsSchema) as VolcengineSettings;
  },
  generate: async (request, settings) => {
    const { baseURL, apiKey } = 
      ByteDance.parseSettings<VolcengineSettings>(settings);
    const model = request.modelId;

    let size: any = null;
    if (request.aspectRatio) {
      size = aspectRatioSizes[request.aspectRatio];
    }

    try {
      let response: Response;
      const requestBody: any = {
        model,
        prompt: request.prompt,
        size,
        response_format: "b64_json",
        sequential_image_generation: request.n && request.n > 1 ? "auto" : "disabled",
      };

      // 设置图片数量（SeedDream 4.5 模型）
      if (request.n && request.n > 1) {
        requestBody.sequential_image_generation_options = {
          max_images: Math.min(request.n, 15) // 最大15张
        };
      }

      // Add image input for i2i
      if (request.images && request.images.length > 0) {
        requestBody.image = request.images;
      }

      response = await fetch(`${baseURL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 404) {
          return {
            errorReason: "CONFIG_ERROR",
            images: [],
          };
        }
        if (response.status === 429) {
          return {
            errorReason: "TOO_MANY_REQUESTS",
            images: [],
          };
        }
        if (response.status === 400) {
          return {
            errorReason: "PROMPT_FLAGGED",
            images: [],
          };
        }
        throw new Error(
          `ByteDance API error: ${(errorData as any)?.error?.message || response.statusText}`
        );
      }

      const generateResult: any = await response.json();

      let imageData: any[] = [];
      if (Array.isArray(generateResult)) {
        imageData = generateResult;
      } else if (generateResult.data && Array.isArray(generateResult.data)) {
        imageData = generateResult.data;
      } else if (generateResult.images && Array.isArray(generateResult.images)) {
        imageData = generateResult.images;
      } else if (generateResult.output && Array.isArray(generateResult.output)) {
        imageData = generateResult.output;
      }

      return {
        images: await Promise.all(
          imageData.map(async (image: any) => {
            if (image.b64_json) {
              return base64ToDataURI(image.b64_json);
            }
            if (image.url) {
              try {
                return await fetchUrlToDataURI(image.url);
              } catch {
                return null;
              }
            }
            if (image.image_url) {
              try {
                return await fetchUrlToDataURI(image.image_url);
              } catch {
                return null;
              }
            }
            if (image.base64) {
              return base64ToDataURI(image.base64);
            }
            return undefined;
          })
        ).then((results) => {
          return results.filter(Boolean) as string[];
        }),
      };
    } catch (e) {
      if ((e as any).status === 401 || (e as any).status === 404) {
        return {
          errorReason: "CONFIG_ERROR",
          images: [],
        };
      }
      throw e;
    }
  },
  generateVideo: async (request: TypixVideoGenerateRequest, settings: ApiProviderSettings): Promise<TypixVideoApiResponse> => {
    const { apiKey, baseURL } = ByteDance.parseSettings<VolcengineSettings>(settings);
    const model = request.modelId;

    try {
      // Prepare request body for video generation
      const requestBody: Record<string, unknown> = {
        model,
        content: [
          {
            text: request.prompt,
            type: "text"
          }
        ],
        generate_audio: true,
        ratio: request.aspectRatio || "adaptive",
        duration: request.duration || 5,
        watermark: false,
      };

      // Create video generation task
      const response = await fetch(`${baseURL}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (response.status === 401 || response.status === 404) {
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

      const data = await response.json() as Record<string, unknown>;

      // Check if task was created successfully
      if (data.id) {
        const taskId = data.id as string;
        
        // Poll for task completion
        const videoUrl = await pollVideoTask(taskId, apiKey, baseURL || defaultBaseURL);
        
        if (videoUrl) {
          return {
            videoUrl,
            status: "completed",
          };
        }
        
        return {
          errorReason: "UNKNOWN",
        };
      }

      return {
        errorReason: "UNKNOWN",
      };
    } catch (error) {
      console.error("ByteDance video generation error:", error);
      return {
        errorReason: "UNKNOWN",
      };
    }
  },
};

async function pollVideoTask(taskId: string, apiKey: string, baseURL: string): Promise<string | null> {
  const maxAttempts = 120; // 30 minutes with 15 second intervals
  const interval = 15000; // 15 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseURL}/contents/generations/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Failed to poll task status: ${response.status}`);
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const data = await response.json() as Record<string, unknown>;
      const status = data.status as string;
      const content = data.content as Record<string, unknown> | undefined;
      
      if (status === "succeeded" && content && content.video_url) {
        return content.video_url as string;
      }
      
      if (status === "failed") {
        console.error("Video generation failed:", data.message);
        return null;
      }
      
      // Continue polling for pending or running status
      if (status === "pending" || status === "running") {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      
      // Unknown status
      console.error("Unknown task status:", status);
      return null;
    } catch (error) {
      console.error("Error polling task status:", error);
      // Continue polling
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error("Video generation timed out");
  return null;
}

export default ByteDance;