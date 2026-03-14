import { apiClient } from "@/app/lib/api-client";
import { inBrowser } from "@/server/lib/env";
import { ServiceException } from "@/server/lib/exception";
import type { AiProvider } from "../types/provider";
import { default as alibaba } from "./alibaba";
import { default as byteDance } from "./bytedance";
import { default as cloudflare } from "./cloudflare";
import { default as google } from "./google";
import { default as openAI } from "./openai";
import { default as flux } from "./flux";
import { default as fal } from "./fal";
import { default as minimax } from "./minimax";
import { default as glm } from "./glm";
import { default as kling } from "./kling";
import { default as vidu } from "./vidu";

export const AI_PROVIDERS = [byteDance, alibaba, cloudflare, google, openAI, flux, fal, minimax, glm, kling, vidu].map(enhancedProvider);

export function getDefaultProvider() {
	return AI_PROVIDERS[0]!;
}

export function getProviderById(providerId: string) {
	const provider = AI_PROVIDERS.find((provider) => provider.id === providerId);
	if (!provider) {
		throw new ServiceException("not_found", "AI provider not found in system");
	}
	return provider;
}
function enhancedProvider(provider: AiProvider): AiProvider {
	return {
		...provider,
		generate: async (request, settings) => {
			// Check is browser environment
			if (!inBrowser || provider.supportCors) {
				return await provider.generate(request, settings);
			}

			// For providers that do not support CORS, we need to proxy: request by: server
			const resp = await apiClient.api.ai["no-auth"][":providerId"].generate.$post({
				param: {
					providerId: provider.id,
				},
				json: {
					request,
					settings,
				},
			});
			if (!resp.ok) {
				throw new ServiceException("error", `Failed to generate with provider ${provider.id}: ${resp.statusText}`);
			}

			const result = await resp.json();
			if (result.code !== "ok") {
				throw new ServiceException(result.code, result.message || `Failed to generate with provider ${provider.id}`);
			}

			return result.data!;
		},
		generateVideo: provider.generateVideo ? async (request, settings) => {
			// Check is browser environment
			if (!inBrowser || provider.supportCors) {
				return await provider.generateVideo!(request, settings);
			}

			// For providers that do not support CORS, we need to proxy: request by: server
			const resp = await apiClient.api.ai["no-auth"][":providerId"]["video"].generate.$post({
				param: {
					providerId: provider.id,
				},
				json: {
					request,
					settings,
				},
			});
			if (!resp.ok) {
				throw new ServiceException("error", `Failed to generate video with provider ${provider.id}: ${resp.statusText}`);
			}

			const result = await resp.json();
			if (result.code !== "ok") {
				throw new ServiceException(result.code, result.message || `Failed to generate video with provider ${provider.id}`);
			}

			return result.data!;
		} : undefined,
	};
}
