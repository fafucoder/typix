import { fetchUrlToDataURI } from "@/server/lib/util";
import { GenError } from "@/server/lib/types";
import type {
  AiProvider,
  ApiProviderSettings,
  ApiProviderSettingsItem,
} from "../types/provider";
import {
  type ProviderSettingsType,
  doParseSettings,
} from "../types/provider";
import type { TypixVideoGenerateRequest, TypixVideoApiResponse, TypixGenerateRequest, TypixChatApiResponse } from "../types/api";

const defaultBaseURL = "https://api.vidu.cn";

const viduSettingsSchema = [
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

export type ViduSettings = ProviderSettingsType<typeof viduSettingsSchema>;

const aspectRatioMap: Record<string, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4",
  "3:2": "3:2",
  "2:3": "2:3",
  "21:9": "21:9",
};

const Vidu: AiProvider = {
  id: "vidu",
  name: "Vidu",
  supportCors: false,
  settings: viduSettingsSchema,

  parseSettings: <ViduSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, viduSettingsSchema) as ViduSettings;
  },

  generate: async (request: TypixGenerateRequest, settings: ApiProviderSettings): Promise<TypixChatApiResponse> => {
    const { apiKey, baseURL } = Vidu.parseSettings<ViduSettings>(settings);
    const model = request.modelId || "viduq2";

    try {
      const requestBody: Record<string, unknown> = {
        model,
        prompt: request.prompt,
      };

      if (request.aspectRatio) {
        requestBody.aspect_ratio = aspectRatioMap[request.aspectRatio] || "16:9";
      }

      if (request.n && request.n > 1) {
        requestBody.n = Math.min(request.n, 9);
      }

      const response = await fetch(`${baseURL}/ent/v2/reference2image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new GenError("CONFIG_ERROR");
        }
        if (response.status === 429) {
          throw new GenError("TOO_MANY_REQUESTS");
        }
        if (response.status === 400) {
          const errorResp = JSON.parse(errorText);
          if (errorResp.error && errorResp.error.code === "InvalidParameter") {
            throw new GenError("PROMPT_FLAGGED");
          }
        }
        throw new Error(`Vidu API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as { task_id: string };

      if (!result.task_id) {
        throw new Error("Failed to submit image generation task");
      }

      const taskId = result.task_id;
      const imageUrls = await pollImageTask(taskId, apiKey, baseURL || defaultBaseURL);

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error("Failed to retrieve generated images");
      }

      const images = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            return await fetchUrlToDataURI(url);
          } catch (error) {
            console.error("Vidu image fetch error:", error);
            return null;
          }
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

  generateVideo: async (request: TypixVideoGenerateRequest, settings: ApiProviderSettings): Promise<TypixVideoApiResponse> => {
    const { apiKey, baseURL } = Vidu.parseSettings<ViduSettings>(settings);
    const model = request.modelId || "viduq3-pro";

    try {
      const requestBody: Record<string, unknown> = {
        model,
        prompt: request.prompt,
      };

      if (request.aspectRatio) {
        requestBody.aspect_ratio = aspectRatioMap[request.aspectRatio] || "16:9";
      }

      if (request.duration) {
        requestBody.duration = request.duration;
      }

      const response = await fetch(`${baseURL}/ent/v2/text2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
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

      const result = await response.json() as { task_id: string };

      if (!result.task_id) {
        return {
          errorReason: "UNKNOWN",
        };
      }

      const taskId = result.task_id;
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
    } catch (error) {
      console.error("Vidu video generation error:", error);
      return {
        errorReason: "UNKNOWN",
      };
    }
  },
};

async function pollImageTask(taskId: string, apiKey: string, baseURL: string): Promise<string[]> {
  const maxAttempts = 60;
  const interval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseURL}/ent/v2/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Failed to poll image task status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const result = await response.json() as {
        state: string;
        images?: Array<{ url: string }>;
      };

      const taskStatus = result.state;

      if (taskStatus === "success" && result.images) {
        return result.images.map(img => img.url).filter(Boolean);
      }

      if (taskStatus === "failed") {
        console.error("Image generation failed");
        return [];
      }

      if (taskStatus === "processing" || taskStatus === "queueing" || taskStatus === "created") {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      console.error("Unknown task status:", taskStatus);
      return [];
    } catch (error) {
      console.error("Error polling image task status:", error);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error("Image generation timed out");
  return [];
}

async function pollVideoTask(taskId: string, apiKey: string, baseURL: string): Promise<string | null> {
  const maxAttempts = 120;
  const interval = 15000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseURL}/ent/v2/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Failed to poll video task status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const result = await response.json() as {
        state: string;
        video_url?: string;
      };

      const taskStatus = result.state;

      if (taskStatus === "success" && result.video_url) {
        return result.video_url;
      }

      if (taskStatus === "failed") {
        console.error("Video generation failed");
        return null;
      }

      if (taskStatus === "processing" || taskStatus === "queueing" || taskStatus === "created") {
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

export default Vidu;
