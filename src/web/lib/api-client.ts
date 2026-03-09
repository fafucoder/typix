import type { AppType } from "@/admin/api";
import { hc } from "hono/client";

const client = hc<AppType>("");
export type ApiClient = typeof client;

export const hcWithType = (...args: Parameters<typeof hc>): ApiClient => hc<AppType>(...args);

const getAccessToken = () => {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('admin-access-token') || '';
	}
	return '';
};

export const apiClient = hcWithType("/", {
	fetch: (async (input, init) => {
		const token = getAccessToken();
		const headers = new Headers(init?.headers);
		
		if (token) {
			headers.set('Authorization', `Bearer ${token}`);
		}
		
		return fetch(input, {
			...init,
			headers,
			credentials: "include",
		});
	}) satisfies typeof fetch,
});
