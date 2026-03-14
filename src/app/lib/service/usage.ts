import useSWR from "swr";
import { usageApi, type UsageDetail, type DailyUsage, type UsageStats } from "@/app/lib/api/usage";

export const useUsageService = () => {
	return {
		getUserUsageDetails: (
			options?: {
				orderId?: string;
				modelId?: string;
				usageType?: string;
				startDate?: string;
				endDate?: string;
				limit?: number;
			}
		) => ({
			swr: (key: string | null) =>
				useSWR<UsageDetail[]>(key, () => usageApi.getUserUsageDetails(options)),
		}),

		getUserDailyUsage: (
			options?: {
				modelId?: string;
				startDate?: string;
				endDate?: string;
			}
		) => ({
			swr: (key: string | null) =>
				useSWR<DailyUsage[]>(key, () => usageApi.getUserDailyUsage(options)),
		}),

		getUserUsageStats: (orderId?: string) => ({
			swr: (key: string | null) =>
				useSWR<UsageStats[]>(key, () => usageApi.getUserUsageStats(orderId)),
		}),
	};
};
