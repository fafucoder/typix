import { subscribeApi } from "@/app/lib/api/subscribe";
import useSWR from "swr";

export const useSubscribeService = () => {
	const getSubscribesWithModels = {
		swr: (key: string | null) => {
			return useSWR(
				key,
				async () => {
					const response = await subscribeApi.getSubscribesWithModels();
					if (response.code !== "ok") {
						throw new Error(response.message || "Failed to get subscribes");
					}
					return response.data;
				},
				{
					revalidateOnFocus: true,
					revalidateOnReconnect: true,
					revalidateOnMount: true,
					dedupingInterval: 0,
					refreshInterval: 0,
				}
			);
		},
	};

	const getCurrentSubscription = {
		swr: (key: string | null) => {
			return useSWR(
				key,
				async () => {
					const response = await subscribeApi.getCurrentSubscription();
					if (response.code !== "ok") {
						throw new Error(response.message || "Failed to get current subscription");
					}
					return response.data;
				},
				{
					revalidateOnFocus: true,
					revalidateOnReconnect: true,
					revalidateOnMount: true,
					dedupingInterval: 0,
					refreshInterval: 0,
				}
			);
		},
	};

	return {
		getSubscribesWithModels,
		getCurrentSubscription,
	};
};
