import { fetchWithAuth } from "@/app/lib/api-client";

export interface ValidateCouponRequest {
	code: string;
	orderId?: string;
}

export interface ValidatedCoupon {
	id: string;
	code: string;
	name: string;
	type: "percentage" | "fixed_amount";
	value: number;
	minOrderAmount: number;
	maxDiscountAmount: number | null;
}

export interface ApiResponse<T> {
	code: string;
	data?: T;
	message?: string;
}

export const couponApi = {
	validateCoupon: async (data: ValidateCouponRequest): Promise<ValidatedCoupon> => {
		const response = await fetchWithAuth("/api/coupons/validate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});
		const result: ApiResponse<ValidatedCoupon> = await response.json();
		if (result.code !== "ok") {
			throw new Error(result.message || "优惠券验证失败");
		}
		return result.data as ValidatedCoupon;
	},
};
