import type { AppType } from "@/server/api";
import { hc } from "hono/client";
import { useUIStore } from "@/app/stores";

// Pre-compile Hono client types at compile time for better IDE performance
// This trick offloads type instantiation from tsserver to tsc
const client = hc<AppType>("");
export type ApiClient = typeof client;

// Create typed client factory with pre-calculated types
export const hcWithType = (...args: Parameters<typeof hc>): ApiClient => hc<AppType>(...args);

// Unified fetch wrapper with 401 error handling
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const response = await fetch(input, {
		...init,
		credentials: "include", // Required for sending cookies cross-origin
	});

	// Handle 401 Unauthorized error globally
	if (response.status === 401) {
		const { openLoginModal } = useUIStore.getState();
		openLoginModal();
	}

	return response;
};

// Export pre-compiled client instance with optimized performance
// Using hcWithType to ensure we get the pre-compiled type benefits
export const apiClient = hcWithType("/", {
	fetch: fetchWithAuth,
});
