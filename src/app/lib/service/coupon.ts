import { couponApi, type ValidatedCoupon } from "@/app/lib/api/coupon";
import useSWR from "swr";

export const useCouponService = () => {
	const validateCoupon = async (code: string, orderId?: string): Promise<ValidatedCoupon> => {
		return couponApi.validateCoupon({ code, orderId });
	};

	return {
		validateCoupon,
	};
};
