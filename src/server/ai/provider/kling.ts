import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
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
import type { TypixVideoGenerateRequest, TypixVideoApiResponse } from "../types/api";

const defaultBaseURL = "https://api-beijing.klingai.com";
const klingSettingsSchema = [
  {
    key: "apiKey",
    type: "password",
    required: true,
  },
  {
    key: "apiSecret",
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

export type KlingSettings = ProviderSettingsType<typeof klingSettingsSchema>;

const aspectRatioToSize: Record<string, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4",
  "3:2": "3:2",
  "2:3": "2:3",
  "21:9": "21:9",
};

function generateKlingSignature(apiKey: string, apiSecret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 15);
  const signatureString = `${apiKey}${timestamp}${nonce}`;
  
  // Simple HMAC-SHA256 signature generation
  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signatureString)
    .digest("hex");
  
  return `${apiKey}:${timestamp}:${nonce}:${signature}`;
}

const Kling: AiProvider = {
  id: "kling",
  name: "可灵 AI",
  supportCors: false,
  settings: klingSettingsSchema,

  parseSettings: <KlingSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, klingSettingsSchema) as KlingSettings;
  },
  
  generate: async (request, settings) => {
    const { apiKey, apiSecret, baseURL } = Kling.parseSettings<KlingSettings>(settings);
    const model = request.modelId || "kling-v3";
    
    try {
      const signature = generateKlingSignature(apiKey, apiSecret);
      
      const requestBody: Record<string, unknown> = {
        model_name: model,
        prompt: request.prompt,
      };

      if (request.aspectRatio) {
        requestBody.aspect_ratio = aspectRatioToSize[request.aspectRatio] || "1:1";
      }

      if (request.n && request.n > 1) {
        requestBody.n = Math.min(request.n, 9);
      }

      const response = await fetch(`${baseURL}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": signature,
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
        throw new Error(`Kling API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as { data: { task_id: string } };

      if (!result.data || !result.data.task_id) {
        throw new Error("Failed to submit image generation task");
      }

      const taskId = result.data.task_id;

      const imageUrls = await pollImageTask(taskId, apiKey, apiSecret, baseURL || defaultBaseURL);

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error("Failed to retrieve generated images");
      }

      const images = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            return await fetchUrlToDataURI(url);
          } catch (error) {
            console.error("Kling image fetch error:", error);
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
    const { apiKey, apiSecret, baseURL } = Kling.parseSettings<KlingSettings>(settings);
    const model = request.modelId || "kling-v3";

    try {
      const signature = generateKlingSignature(apiKey, apiSecret);
      
      const requestBody: Record<string, unknown> = {
        model_name: model,
        prompt: request.prompt,
      };

      if (request.aspectRatio) {
        requestBody.aspect_ratio = aspectRatioToSize[request.aspectRatio] || "16:9";
      }

      if (request.duration) {
        requestBody.duration = request.duration;
      }

      const response = await fetch(`${baseURL}/v1/videos/text2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": signature,
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

      const result = await response.json() as { data: { task_id: string } };

      if (!result.data || !result.data.task_id) {
        return {
          errorReason: "UNKNOWN",
        };
      }

      const taskId = result.data.task_id;
      
      const videoUrl = await pollVideoTask(taskId, apiKey, apiSecret, baseURL || defaultBaseURL);
      
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
      console.error("Kling video generation error:", error);
      return {
        errorReason: "UNKNOWN",
      };
    }
  },
};

async function pollImageTask(taskId: string, apiKey: string, apiSecret: string, baseURL: string): Promise<string[]> {
  const maxAttempts = 60;
  const interval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const signature = generateKlingSignature(apiKey, apiSecret);

      const response = await fetch(`${baseURL}/v1/images/generations/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": signature,
        },
      });

      if (!response.ok) {
        console.error(`Failed to poll image task status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const result = await response.json() as { 
        data: { 
          task_status: string; 
          task_result?: { 
            images?: Array<{ url: string }> 
          } 
        } 
      };

      if (result.data) {
        const taskStatus = result.data.task_status;
        
        if (taskStatus === "succeed" && result.data.task_result?.images) {
          return result.data.task_result.images.map(img => img.url).filter(Boolean);
        }
        
        if (taskStatus === "failed") {
          console.error("Image generation failed");
          return [];
        }
        
        if (taskStatus === "processing" || taskStatus === "pending") {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        console.error("Unknown task status:", taskStatus);
        return [];
      }
    } catch (error) {
      console.error("Error polling image task status:", error);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error("Image generation timed out");
  return [];
}

async function pollVideoTask(taskId: string, apiKey: string, apiSecret: string, baseURL: string): Promise<string | null> {
  const maxAttempts = 120;
  const interval = 15000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const signature = generateKlingSignature(apiKey, apiSecret);

      const response = await fetch(`${baseURL}/v1/videos/text2video/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": signature,
        },
      });

      if (!response.ok) {
        console.error(`Failed to poll video task status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      const result = await response.json() as { 
        data: { 
          task_status: string; 
          task_result?: { 
            videos?: Array<{ url: string }> 
          } 
        } 
      };

      if (result.data) {
        const taskStatus = result.data.task_status;
        
        if (taskStatus === "succeed" && result.data.task_result?.videos && result.data.task_result.videos.length > 0) {
          const videoUrl = result.data.task_result.videos[0]?.url;
          if (videoUrl) {
            return videoUrl;
          }
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
      }
    } catch (error) {
      console.error("Error polling video task status:", error);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error("Video generation timed out");
  return null;
}

export default Kling;
