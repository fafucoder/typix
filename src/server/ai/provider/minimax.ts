import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
import type {
  AiProvider,
  ApiProviderSettings,
  ApiProviderSettingsItem,
} from "../types/provider";
import {
  type ProviderSettingsType,
  doParseSettings,
} from "../types/provider";
import type { TypixVideoGenerateRequest, TypixVideoApiResponse } from "../types/api";

const defaultBaseURL = "https://api.minimaxi.chat/v1";
const minimaxSettingsSchema = [
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

export type MinimaxSettings = ProviderSettingsType<typeof minimaxSettingsSchema>;

const aspectRatioSizes = {
  "1:1": "1024x1024",
  "16:9": "1280x720",
  "9:16": "720x1280",
  "4:3": "1024x768",
  "3:4": "768x1024",
};

const Minimax: AiProvider = {
  id: "minimax",
  name: "MiniMax",
  supportCors: false,
  settings: minimaxSettingsSchema,

  parseSettings: <MinimaxSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, minimaxSettingsSchema) as MinimaxSettings;
  },
  generate: async (request, settings) => {
    const { baseURL, apiKey } = 
      Minimax.parseSettings<MinimaxSettings>(settings);
    const model = request.modelId;

    let size: any = null;
    if (request.aspectRatio) {
      size = aspectRatioSizes[request.aspectRatio];
    }

    try {
      // Get ability from request.model
      const ability = request.model?.ability || "t2i";

      let response: Response;
      
      if (ability === "t2i") {
        // Text-to-image generation
        const requestBody: any = {
          model,
          prompt: request.prompt,
        };

        // Add aspect ratio if specified
        if (size) {
          requestBody.size = size;
        }

        // Add number of images
        if (request.n && request.n > 1) {
          requestBody.n = Math.min(request.n, 4); // MiniMax supports up to 4 images
        }

        response = await fetch(`${baseURL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        throw new Error("MiniMax only supports text-to-image generation");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(
          `MiniMax API error: ${response.status} ${response.statusText} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };

      // Convert base64 to data URI
      const images = await Promise.all(
        data.data.map(async (item) => {
          if (item.b64_json) {
            return base64ToDataURI(item.b64_json, "image/jpeg");
          } else if (item.url) {
            return await fetchUrlToDataURI(item.url);
          }
          throw new Error("No image data in response");
        })
      );

      return {
        images,
        model: request.modelId,
        provider: "minimax",
      };
    } catch (error) {
      throw error;
    }
  },

  generateVideo: async (request: TypixVideoGenerateRequest, settings: ApiProviderSettings): Promise<TypixVideoApiResponse> => {
    const { baseURL, apiKey } = 
      Minimax.parseSettings<MinimaxSettings>(settings);
    const model = request.modelId || "MiniMax-Hailuo-2.3";

    try {
      // Prepare request body for video generation
      const requestBody: Record<string, unknown> = {
        model,
        prompt: request.prompt,
        duration: request.duration || 6,
        resolution: "1080P",
      };

      // Create video generation task
      const response = await fetch(`${baseURL}/video_generation`, {
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
      if (data.task_id) {
        const taskId = data.task_id as string;
        
        // Poll for task completion
        const videoUrl = await pollVideoTask(taskId, apiKey, baseURL||defaultBaseURL);
        
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
      console.error("MiniMax video generation error:", error);
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
      const response = await fetch(`${baseURL}/video_generation/tasks/${taskId}`, {
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
      const fileId = data.file_id as string | undefined;
      
      if (status === "succeeded" && fileId) {
        // Get video URL using file_id
        const videoUrl = await getVideoUrl(fileId, apiKey, baseURL);
        return videoUrl;
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

async function getVideoUrl(fileId: string, apiKey: string, baseURL: string): Promise<string | null> {
  try {
    const response = await fetch(`${baseURL}/files/${fileId}/download_url`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to get video URL: ${response.status}`);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    return data.url as string | null;
  } catch (error) {
    console.error("Error getting video URL:", error);
    return null;
  }
}

export default Minimax;
