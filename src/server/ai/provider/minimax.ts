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
    defaultValue: "https://api.minimaxi.chat/v1",
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
};

export default Minimax;
