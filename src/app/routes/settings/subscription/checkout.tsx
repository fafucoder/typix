import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { SettingsPageLayout } from "@/app/routes/settings/-components/SettingsPageLayout";
import { useState, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useUIStore } from "@/app/stores";
import { useOrderService } from "@/app/lib/service/order";
import { useCouponService } from "@/app/lib/service/coupon";
import type { ValidatedCoupon } from "@/app/lib/api/coupon";
import { ModelIcon } from "@lobehub/icons";

export const Route = createFileRoute("/settings/subscription/checkout")({
	component: SubscriptionCheckoutPage,
});

function SubscriptionCheckoutPage() {
	const { t } = useTranslation();
	const { isLogin } = useAuth();
	const { openLoginModal } = useUIStore();
	const [isConfirming, setIsConfirming] = useState<boolean>(false);
	const [couponCode, setCouponCode] = useState<string>("");
	const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null);
	const [couponError, setCouponError] = useState<string | null>(null);
	const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
	const couponService = useCouponService();

	// 从 URL 查询参数获取 orderId
	const search = useSearch({ from: "/settings/subscription/checkout" }) as { orderId?: string };
	const orderId = search.orderId;

	const orderService = useOrderService();

	// 从 API 获取订单详情
	const { data: orderData, isLoading, error } = orderService.getOrder(orderId || "").swr(orderId ? `order-${orderId}` : "");

	// 格式化价格
	const formatPrice = (price: number) => {
		return (price / 100).toFixed(2);
	};

	// 计算折扣金额
	const calculateDiscountAmount = (coupon: ValidatedCoupon, originalAmount: number): number => {
		let discountAmount = 0;
		
		if (coupon.type === "percentage") {
			discountAmount = Math.floor(originalAmount * coupon.value / 100);
			// 如果有最大折扣限制，应用限制
			if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
				discountAmount = coupon.maxDiscountAmount;
			}
		} else if (coupon.type === "fixed_amount") {
			discountAmount = coupon.value;
		}
		
		// 确保折扣金额不超过原价
		if (discountAmount > originalAmount) {
			discountAmount = originalAmount;
		}
		
		return discountAmount;
	};

	// 应用优惠券
	const handleApplyCoupon = async () => {
		if (!couponCode.trim()) {
			setCouponError(t("settings.subscription.pleaseEnterCoupon"));
			return;
		}

		setIsApplyingCoupon(true);
		setCouponError(null);
		
		try {
			const result = await couponService.validateCoupon(couponCode, orderId);
			
			// 检查最低订单金额
			const originalPrice = subscribe?.originalPrice || subscribe?.price || orderData.totalAmount;
			if (result.minOrderAmount > 0 && originalPrice < result.minOrderAmount) {
				setCouponError(t("settings.subscription.minOrderAmountRequired", { 
					amount: formatPrice(result.minOrderAmount) 
				}));
				return;
			}
			
			setValidatedCoupon(result);
		} catch (error: any) {
			setCouponError(error.message || t("settings.subscription.invalidCoupon"));
			setValidatedCoupon(null);
		} finally {
			setIsApplyingCoupon(false);
		}
	};

	// 移除优惠券
	const handleRemoveCoupon = () => {
		setValidatedCoupon(null);
		setCouponCode("");
		setCouponError(null);
	};

	// 处理确认订购
	const handleConfirmOrder = async () => {
		if (!isLogin) {
			openLoginModal();
			return;
		}

		if (!orderData) {
			return;
		}

		setIsConfirming(true);
		try {
			// TODO: 调用支付接口
			alert(t("settings.subscription.paymentInDevelopment"));
		} catch (error: any) {
			alert(error.message || t("settings.subscription.paymentFailed"));
		} finally {
			setIsConfirming(false);
		}
	}

	if (isLoading) {
		return (
			<SettingsPageLayout>
				<div className="flex items-center justify-center h-64">
					<div className="text-muted-foreground">{t("common.loading")}</div>
				</div>
			</SettingsPageLayout>
		)
	}

	if (error || !orderData) {
		return (
			<SettingsPageLayout>
				<div className="flex flex-col items-center justify-center h-64 gap-4">
					<div className="text-red-500">{t("settings.subscription.orderNotFound")}</div>
					<Button asChild variant="outline">
						<Link to="/settings/subscription">{t("settings.subscription.backToPlans")}</Link>
					</Button>
				</div>
			</SettingsPageLayout>
		)
	}

	// 获取订阅信息
	const subscribe = orderData.subscribe;

	return (
		<SettingsPageLayout>
			<div className="max-w-6xl mx-auto p-6">
				{/* 页面标题 */}
				<div className="mb-8">
					<Link to="/settings/subscription" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
						<ArrowLeft className="h-4 w-4 mr-1" />
						{t("settings.subscription.backToPlans")}
					</Link>
					<h1 className="text-3xl font-bold">{t("settings.subscription.orderConfirmation")}</h1>
					<p className="text-muted-foreground mt-1">{t("settings.subscription.confirmOrderInfo")}</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
					{/* 左侧：订单信息 (占3列) */}
					<div className="lg:col-span-3 space-y-6">
						{/* 套餐信息卡片 */}
						<Card>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2 mb-2">
											<CardTitle className="text-xl">{subscribe?.name || t("settings.subscription.plan")}</CardTitle>
											{subscribe?.isPopular ===true && (
												<span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">{t("settings.subscription.popular")}</span>
											)}
										</div>
										<p className="text-muted-foreground text-sm">{subscribe?.description || t("settings.subscription.defaultDescription")}</p>
									</div>
								</div>
							</CardHeader>
						</Card>

						{/* 可用模型 */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">{t("settings.subscription.availableModels")}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{subscribe?.models && subscribe.models.length > 0 ? (
										subscribe.models.map((model) => (
											<div key={model.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
												<div className="flex items-center gap-3">
													<Suspense fallback={
															<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
																<Sparkles className="w-4 h-4 text-muted-foreground" />
															</div>
														}>
															<div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border shadow-sm overflow-hidden">
																<ModelIcon
																			model={model.name || model.id}
																			size={24}
																			type="color"
																		/>
																	</div>
																</Suspense>
																<span className="text-sm font-medium">{model.name}</span>
															</div>
															<span className="text-sm text-muted-foreground">
																{model.maxUsage === 0
																	? t("settings.subscription.unlimited")
																	: t("settings.subscription.usageCount", {
																		count: model.maxUsage,
																		unit: model.modelType === "text2video" ? t("settings.subscription.videos") : model.modelType === "text2image" ? t("settings.subscription.images") : t("settings.subscription.times")
																	})
																}
															</span>
											</div>
											))
										) : (
											<p className="text-sm text-muted-foreground">{t("settings.subscription.noModels")}</p>
										)}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* 右侧：订单信息和价格明细 (占2列) */}
					<div className="lg:col-span-2 space-y-4">
						{/* 订单信息卡片 */}
						<Card className="py-2">
							<CardHeader className="pb-2">
								<CardTitle className="text-lg">{t("settings.subscription.orderInfo")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-0 pt-0">
								{/* 套餐周期 */}
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-muted-foreground text-sm">{t("settings.subscription.planDuration")}</span>
									<span className="text-sm">{subscribe?.duration ? `${subscribe.duration} ${t("settings.subscription.days")}` : t("settings.subscription.yearly")}</span>
								</div>
								{/* 订单号 */}
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-muted-foreground text-sm">{t("settings.subscription.orderNumber")}</span>
									<span className="text-sm font-mono">{orderData.orderNo}</span>
								</div>
								{/* 创建时间 */}
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-muted-foreground text-sm">{t("settings.subscription.createdAt")}</span>
									<span className="text-sm">{new Date(orderData.createdAt).toLocaleString()}</span>
								</div>
								{/* 有效期至 */}
								<div className="flex justify-between items-center py-2">
									<span className="text-muted-foreground text-sm">{t("settings.subscription.expiresAt")}</span>
									<span className="text-sm">{orderData.expiresAt ? new Date(orderData.expiresAt).toLocaleString() : '-'}</span>
								</div>
							</CardContent>
						</Card>

						{/* 价格明细卡片 */}
						<Card className="sticky top-6">
							<CardHeader>
								<CardTitle className="text-lg">{t("settings.subscription.priceDetails")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* 原价 */}
								<div className="flex justify-between items-center">
									<span className="text-muted-foreground">
										{subscribe?.duration
											? t("settings.subscription.planPrice", { cycle: subscribe.duration >= 365 ? t("settings.subscription.yearly") : subscribe.duration >= 30 ? t("settings.subscription.monthly") : t("settings.subscription.days", { days: subscribe.duration }) })
											: t("settings.subscription.planPriceOnly")
										}
									</span>
									<span className="font-medium">¥{formatPrice(subscribe?.originalPrice || subscribe?.price || orderData.totalAmount)}</span>
								</div>

								{/* 优惠 */}
								{orderData.discountAmount > 0 && (
									<div className="flex justify-between items-center text-primary">
										<span>{t("settings.subscription.firstOrderDiscount")}</span>
										<span>-¥{formatPrice(orderData.discountAmount)}</span>
									</div>
								)}

								{/* 优惠券折扣 */}
								{validatedCoupon && (() => {
									const originalPrice = subscribe?.originalPrice || subscribe?.price || orderData.totalAmount;
									const couponDiscount = calculateDiscountAmount(validatedCoupon, originalPrice);
									return (
										<div className="flex justify-between items-center text-primary">
											<span>{validatedCoupon.name}</span>
											<span>-¥{formatPrice(couponDiscount)}</span>
										</div>
									);
								})()}

								<div className="border-t pt-4">
									<div className="flex justify-between items-center">
										<span className="font-medium">{t("settings.subscription.totalAmount")}</span>
										<div className="text-right">
											{(() => {
												const originalPrice = subscribe?.originalPrice || subscribe?.price || orderData.totalAmount;
												let finalAmount = orderData.actualAmount;
												
												if (validatedCoupon) {
													const couponDiscount = calculateDiscountAmount(validatedCoupon, originalPrice);
													finalAmount = Math.max(0, finalAmount - couponDiscount);
												}
												
												return (
													<>
														<span className="text-2xl font-bold text-primary">¥{formatPrice(finalAmount)}</span>
														{(validatedCoupon || (subscribe?.originalPrice && subscribe.originalPrice > finalAmount)) && (
															<p className="text-xs text-muted-foreground line-through">¥{formatPrice(originalPrice)}</p>
														)}
													</>
												);
											})()}
										</div>
									</div>
								</div>

								{/* 优惠券 */}
								<div className="pt-4 border-t">
									<p className="text-sm font-medium mb-2">{t("settings.subscription.couponCode")}</p>
									
									{validatedCoupon ? (
										<div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-md">
											<div className="flex items-center gap-2">
												<CheckCircle2 className="h-4 w-4 text-primary" />
												<span className="text-sm font-medium text-primary">{validatedCoupon.code}</span>
												<span className="text-xs text-primary/80">- {validatedCoupon.name}</span>
											</div>
											<Button 
												variant="ghost" 
												size="sm" 
												className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
												onClick={handleRemoveCoupon}
											>
												{t("common.remove")}
											</Button>
										</div>
									) : (
										<>
											<div className="flex gap-2">
												<input
													type="text"
													className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
													placeholder={t("settings.subscription.enterCoupon")}
													value={couponCode}
													onChange={(e) => {
														setCouponCode(e.target.value);
														if (couponError) setCouponError(null);
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															handleApplyCoupon();
														}
													}}
												/>
												<Button 
													variant="outline" 
													size="sm" 
													onClick={handleApplyCoupon}
													disabled={isApplyingCoupon}
												>
													{isApplyingCoupon ? t("common.processing") : t("settings.subscription.apply")}
												</Button>
											</div>
											{couponError && (
												<div className="flex items-center gap-1 mt-2 text-destructive text-sm">
													<XCircle className="h-4 w-4" />
													<span>{couponError}</span>
												</div>
											)}
											<p className="text-xs text-muted-foreground mt-2">{t("settings.subscription.tryThese")}: WELCOME500, AI2026, SAVE20</p>
										</>
									)}
								</div>

								{/* 确认订购按钮 */}
								<div className="pt-4 space-y-3">
									<Button
										className="w-full bg-primary hover:bg-primary/90"
										onClick={handleConfirmOrder}
										disabled={isConfirming}
									>
										{isConfirming ? (
											<span>{t("settings.subscription.processing")}</span>
										) : (
											<span className="flex items-center justify-center">
												{t("settings.subscription.confirmOrder")}
												<ChevronRight className="h-4 w-4 ml-1" />
											</span>
										)}
									</Button>

									<Button variant="outline" className="w-full" asChild>
										<Link to="/settings/subscription">{t("settings.subscription.cancelOrder")}</Link>
									</Button>
								</div>

								<p className="text-xs text-muted-foreground text-center pt-2">
									{t("settings.subscription.agreementPrefix")}
									<a href="#" className="text-primary hover:underline">{t("settings.subscription.termsOfService")}</a> {t("common.and")}
									<a href="#" className="text-primary hover:underline">{t("settings.subscription.privacyPolicy")}</a>
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</SettingsPageLayout>
	)
}
