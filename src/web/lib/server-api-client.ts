import type { AppType } from "@/server/api";
import { hc } from "hono/client";

const client = hc<AppType>("");
export type ServerApiClient = typeof client;

export const hcWithType = (...args: Parameters<typeof hc>): ServerApiClient => hc<AppType>(...args);

export const serverApiClient = hcWithType("/", {
	fetch: (async (input, init) => {
		return fetch(input, {
			...init,
			credentials: "include",
		});
	}) satisfies typeof fetch,
});