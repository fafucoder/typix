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

const doubaoSettingsSchema = [
  {
    key: "apiKey",
    type: "password",
    required: true,
  },
  {
    key: "baseURL",
    type: "url",
    required: false,
    defaultValue: "https://ark.cn-beijing.volces.com/api/v3",
  },
] as const satisfies ApiProviderSettingsItem[];

export type DoubaoSettings = ProviderSettingsType<typeof doubaoSettingsSchema>;

const aspectRatioSizes = {
  "1:1": "2048x2048",
  "16:9": "2560x1440",
  "9:16": "1440x2560",
  "4:3": "2304x1728",
  "3:4": "1728x2304",
};

const Doubao: AiProvider = {
  id: "doubao",
  name: "Doubao",
  supportCors: false,
  enabledByDefault: true,
  settings: doubaoSettingsSchema,
  models: [
    {
      id: "doubao-seedream-4-5-251128",
      name: "SeedDream4.5",
      ability: "i2i",
      maxInputImages: 14,
      enabledByDefault: true,
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    },
  ],
  parseSettings: <DoubaoSettings>(settings: ApiProviderSettings) => {
    return doParseSettings(settings, doubaoSettingsSchema) as DoubaoSettings;
  },
  generate: async (request, settings) => {
    const { baseURL, apiKey } = 
      Doubao.parseSettings<DoubaoSettings>(settings);
    const model = request.modelId;

    let size: any = null;
    if (request.aspectRatio) {
      size = aspectRatioSizes[request.aspectRatio];
    }

    try {
      const ability = chooseAblility(
        request,
        findModel(Doubao, request.modelId).ability
      );

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
          `Doubao API error: ${(errorData as any)?.error?.message || response.statusText}`
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
};

export default Doubao;