import { base64ToDataURI, fetchUrlToDataURI } from "@/server/lib/util";
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

const glmSettingsSchema = [
  {
    key: "apiKey",
    type: "password",
    required: true,
  },
  {
    key: "baseURL",
    type: "url",
    required: false,
    defaultValue: "https://open.bigmodel.cn/api/paas/v4",
  },
] as const satisfies ApiProviderSettingsItem[];

export type GlmSettings = ProviderSettingsType<typeof glmSettingsSchema>;

const aspectRatioSizes = {
  "1:1": "1024x1024",
  "16:9": "1280x720",
  "9:16": "720x1280",
  "4:3": "1024x768",
  "3:4": "768x1024",
};

const Glm: AiProvider = {
  id: "glm",
  name: "GLM (智谱AI)",
  supportCors: false,
  enabledByDefault: true,
  settings: glmSettingsSchema,
  models: [
    {
      id: "cogview-3-plus",
      name: "CogView-3-Plus",
      ability: "t2i",
      maxInputImages: 0,
      enabledByDefault: true,
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    },
    {
      id: "cogview-3",
      name: "CogView-3",
      ability: "t2i",
      maxInputImages: 0,
      enabledByDefault: false,
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    },
  ],
  parseSettings: <GlmSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, glmSettingsSchema) as GlmSettings;
  },
  generate: async (request, settings) => {
    const { baseURL, apiKey } = 
      Glm.parseSettings<GlmSettings>(settings);
    const model = request.modelId;

    let size: any = null;
    if (request.aspectRatio) {
      size = aspectRatioSizes[request.aspectRatio];
    }

    try {
      const ability = chooseAblility(
        request,
        findModel(Glm, request.modelId).ability
      );

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

        // Add number of images (GLM supports 1-4)
        if (request.n && request.n > 1) {
          requestBody.n = Math.min(request.n, 4);
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
        throw new Error("GLM only supports text-to-image generation");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(
          `GLM API error: ${response.status} ${response.statusText} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json() as any;

      // Convert base64 to data URI
      const images = await Promise.all(
        data.data.map(async (item: any) => {
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
        provider: "glm",
      };
    } catch (error) {
      throw error;
    }
  },
};

export default Glm;
