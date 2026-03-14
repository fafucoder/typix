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

const defaultBaseURL = "https://dashscope.aliyuncs.com/api/v1";

// BaiLian Settings Schema
const bailianSettingsSchema = [
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

export type BailianSettings = ProviderSettingsType<typeof bailianSettingsSchema>;

const aspectRatioSizes = {
  "1:1": "1024*1024",
  "16:9": "1792*1024",
  "9:16": "1024*1792",
  "4:3": "1536*1024",
  "3:4": "1024*1536",
};

const aspectRatioToSize: Record<string, string> = {
  "1:1": "1440*1440",
  "16:9": "1920*1080",
  "9:16": "1080*1920",
  "4:3": "1632*1248",
  "3:4": "1248*1632",
};

// Alibaba Provider
const Alibaba: AiProvider = {
  id: "alibaba",
  name: "Alibaba",
  supportCors: false,
  settings: bailianSettingsSchema,

  parseSettings: <BailianSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, bailianSettingsSchema) as BailianSettings;
  },
  generate: async (request, settings) => {
    try {
      const { baseURL, apiKey } = Alibaba.parseSettings<BailianSettings>(settings);
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
    generateVideo: async (request: TypixVideoGenerateRequest, settings: ApiProviderSettings): Promise<TypixVideoApiResponse> => {
    const { apiKey, baseURL } = Alibaba.parseSettings<BailianSettings>(settings);
    const model = request.modelId;

    try {
      // Prepare request body for video generation
      const requestBody: Record<string, unknown> = {
        model,
        input: {
          prompt: request.prompt,
        },
        parameters: {} as Record<string, unknown>,
      };

      // Add aspect ratio
      if (request.aspectRatio) {
        (requestBody.parameters as Record<string, unknown>).size = aspectRatioToSize[request.aspectRatio];
      }

      // Add duration
      if (request.duration) {
        (requestBody.parameters as Record<string, unknown>).duration = request.duration;
      }

      // Enable prompt extension by default for better results
      (requestBody.parameters as Record<string, unknown>).prompt_extend = true;

      // Create video generation task
      const response = await fetch(`${baseURL}/services/aigc/video-generation/video-synthesis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-DashScope-Async": "enable",
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
      if (data.output && (data.output as Record<string, unknown>).task_id) {
        const taskId = (data.output as Record<string, unknown>).task_id as string;
        
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
      console.error("Wanxiang video generation error:", error);
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
      const response = await fetch(`${baseURL}/tasks/${taskId}`, {
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
      const output = data.output as Record<string, unknown> | undefined;
      
      if (output) {
        const taskStatus = output.task_status as string;
        
        if (taskStatus === "SUCCEEDED") {
          return output.video_url as string | null;
        }
        
        if (taskStatus === "FAILED") {
          console.error("Video generation failed:", output.message);
          return null;
        }
        
        // Continue polling for PENDING or RUNNING status
        if (taskStatus === "PENDING" || taskStatus === "RUNNING") {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // Unknown status
        console.error("Unknown task status:", taskStatus);
        return null;
      }
    } catch (error) {
      console.error("Error polling task status:", error);
      // Continue polling
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  console.error("Video generation timed out");
  return null;
}

export default Alibaba;