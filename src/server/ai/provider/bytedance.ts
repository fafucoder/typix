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
      console.log('[ByteDance Video] Starting video generation:', {
        model,
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        duration: request.duration,
        baseURL: baseURL || defaultBaseURL,
        hasApiKey: !!apiKey,
      });

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

      console.log('[ByteDance Video] Request body:', JSON.stringify(requestBody, null, 2));

      // Create video generation task
      const response = await fetch(`${baseURL || defaultBaseURL}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[ByteDance Video] API response status:', response.status);
      console.log('[ByteDance Video] API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        console.log('[ByteDance Video] API error data:', errorData);
        
        if (response.status === 401 || response.status === 404) {
          console.error('[ByteDance Video] Authentication error or endpoint not found');
          return {
            errorReason: "CONFIG_ERROR",
          };
        }
        if (response.status === 429) {
          console.error('[ByteDance Video] Rate limit exceeded');
          return {
            errorReason: "TOO_MANY_REQUESTS",
          };
        }
        if (response.status === 400) {
          console.error('[ByteDance Video] Bad request:', errorData);
          return {
            errorReason: "API_ERROR",
          };
        }
        const errorMessage = (errorData.message as string) || `HTTP error! status: ${response.status}`;
        console.error('[ByteDance Video] Unexpected error:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json() as Record<string, unknown>;
      console.log('[ByteDance Video] API response data:', data);

      // Check if task was created successfully
      if (data.id) {
        const taskId = data.id as string;
        console.log('[ByteDance Video] Task created successfully:', taskId);
        
        // Poll for task completion
        const videoUrl = await pollVideoTask(taskId, apiKey, baseURL || defaultBaseURL);
        
        if (videoUrl) {
          console.log('[ByteDance Video] Video generation completed:', videoUrl);
          return {
            videoUrl,
            status: "completed",
          };
        }
        
        console.error('[ByteDance Video] Video generation failed without URL');
        return {
          errorReason: "UNKNOWN",
        };
      }

      console.error('[ByteDance Video] No task ID in response:', data);
      return {
        errorReason: "UNKNOWN",
      };
    } catch (error) {
      console.error('[ByteDance Video] Video generation error:', error);
      return {
        errorReason: "UNKNOWN",
      };
    }
  },
};

async function pollVideoTask(taskId: string, apiKey: string, baseURL: string): Promise<string | null> {
  const maxAttempts = 120; // 30 minutes with 15 second intervals
  const interval = 15000; // 15 seconds

  console.log('[ByteDance Video] Starting to poll task:', taskId);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[ByteDance Video] Polling task ${taskId}, attempt ${attempt + 1}/${maxAttempts}`);
      
      const response = await fetch(`${baseURL}/contents/generations/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      console.log(`[ByteDance Video] Poll response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text');
        console.error(`[ByteDance Video] Failed to poll task status: ${response.status}, ${errorText}`);
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const data = await response.json() as Record<string, unknown>;
      console.log(`[ByteDance Video] Poll response data:`, data);
      
      const status = data.status as string;
      const content = data.content as Record<string, unknown> | undefined;
      
      if (status === "succeeded" && content && content.video_url) {
        console.log(`[ByteDance Video] Task ${taskId} succeeded, video URL:`, content.video_url);
        return content.video_url as string;
      }
      
      if (status === "failed") {
        console.error(`[ByteDance Video] Task ${taskId} failed:`, data.message);
        return null;
      }
      
      // Continue polling for pending, running, or queued status
			if (status === "pending" || status === "running" || status === "queued") {
				console.log(`[ByteDance Video] Task ${taskId} status: ${status}, waiting ${interval}ms`);
				await new Promise(resolve => setTimeout(resolve, interval));
				continue;
			}
      
      // Unknown status
      console.error(`[ByteDance Video] Task ${taskId} unknown status:`, status);
      return null;
    } catch (error) {
      console.error(`[ByteDance Video] Error polling task ${taskId}:`, error);
      // Continue polling
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error(`[ByteDance Video] Task ${taskId} timed out after ${maxAttempts} attempts`);
  return null;
}

export default ByteDance;