import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { SettingsPageLayout } from "@/app/routes/settings/-components/SettingsPageLayout";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Outlet, Link, useRouter, useLocation } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useUIStore } from "@/app/stores";
import { useSubscribeService } from "@/app/lib/service/subscribe";
import { useOrderService } from "@/app/lib/service/order";
import type { SubscribeModel, SubscribeWithModels } from "@/app/lib/api/subscribe";
import { mutate } from "swr";

export const Route = createFileRoute("/settings/subscription")({
	component: SubscriptionSettingsPage,
});

// 获取模型使用单位
const getUsageUnit = (model: SubscribeModel, t: (key: string, options?: Record<string, string>) => string): string => {
	if (model.maxUsage === 0) {
		return t("settings.subscription.unlimited");
	}
	
	const count = model.maxUsage.toLocaleString();
	if (model.modelType === "text2video") {
		return t("settings.subscription.usageVideos", { count });
	}
	return t("settings.subscription.usageImages", { count });
};

function SubscriptionSettingsPage() {
	const { t } = useTranslation();
	const { isLogin } = useAuth();
	const { openLoginModal } = useUIStore();
	const router = useRouter();
	const location = useLocation();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">('monthly');
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [creatingOrder, setCreatingOrder] = useState<string | null>(null);
	const subscribeService = useSubscribeService();
	const orderService = useOrderService();

	// 从 API 获取订阅数据
	const { data: subscribesData, isLoading, error } = subscribeService.getSubscribesWithModels.swr("subscribes-with-models");

	// 检查当前是否在子路由中（如 checkout 页面）
	const currentPath = location.pathname;
	const isInSubRoute = currentPath.includes('/subscription/checkout');

	// 当从子路由返回时，强制刷新数据
	useEffect(() => {
		if (!isInSubRoute) {
			mutate("subscribes-with-models");
		}
	}, [isInSubRoute, currentPath]);

	// 如果在子路由中，只渲染 Outlet
	if (isInSubRoute) {
		return <Outlet />;
	}

	// 获取当前周期的套餐
	const currentPlans = subscribesData && billingCycle ? (subscribesData[billingCycle] || []) : [];

	// 格式化价格
	const formatPrice = (price: number) => {
		return (price / 100).toFixed(2);
	};

	// 处理订阅 - 创建订单并跳转到确认页
	const handleSubscribe = async (planId: string) => {
		// 检查用户是否登录
		if (!isLogin) {
			openLoginModal();
			return;
		}

		// 开始创建订单
		setCreatingOrder(planId);
		try {
			const result = await orderService.createOrder({
				subscribeId: planId,
				type: "subscription",
			});
			// 创建成功，跳转到确认页面
			router.navigate({
				to: "/settings/subscription/checkout",
				search: { orderId: result.orderId },
			});
		} catch (error: any) {
			alert(error.message || t("settings.subscription.createOrderFailed"));
		} finally {
			setCreatingOrder(null);
		}
	};

	if (isLoading) {
		return (
			<SettingsPageLayout>
				<div className="flex items-center justify-center h-64">
					<div className="text-muted-foreground">{t("common.loading")}</div>
				</div>
			</SettingsPageLayout>
		);
	}

	if (error) {
			return (
				<SettingsPageLayout>
					<div className="flex items-center justify-center h-64">
						<div className="text-red-500">{t("common.error")}: {error.message || String(error)}</div>
					</div>
				</SettingsPageLayout>
			);
		}

		// 检查订阅数据是否存在
		if (!subscribesData) {
			return (
				<SettingsPageLayout>
					<div className="flex items-center justify-center h-64">
						<div className="text-red-500">{t("common.error")}: {t("settings.subscription.noPlans")}</div>
					</div>
				</SettingsPageLayout>
			);
		}

	return (
		<SettingsPageLayout>
			<div className="space-y-8">
				{/* 页面标题 */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">{t("settings.subscription.plans.title")}</h1>
					<p className="text-muted-foreground">{t("settings.subscription.plans.description")}</p>
				</div>

				{/* 计费周期选择 */}
				<div className="flex justify-center mb-8">
					<div className="inline-flex rounded-lg bg-muted p-1" role="group">
						<button
							type="button"
							className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
							onClick={() => setBillingCycle("monthly")}
						>
							{t("settings.subscription.billing.monthly")}
						</button>
						<button
							type="button"
							className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billingCycle === "quarterly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
							onClick={() => setBillingCycle("quarterly")}
						>
							{t("settings.subscription.billing.quarterly")}
						</button>
						<button
							type="button"
							className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
							onClick={() => setBillingCycle("yearly")}
						>
							{t("settings.subscription.billing.yearly")}
						</button>
					</div>
				</div>

				{/* 套餐选择 */}
				{currentPlans.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{currentPlans.map((plan: SubscribeWithModels) => (
							<Card
								key={plan.id}
								className={`relative cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-xl ${
									selectedPlanId === plan.id
										? "border border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
										: "border-border hover:border-primary/50"
									}`}
								onClick={() => setSelectedPlanId(plan.id)}
							>
								<CardHeader>
									<div className="flex items-center gap-2">
										<CardTitle>{plan.name}</CardTitle>
										{plan.isPopular === true && (
											<span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">{t("settings.subscription.popular")}</span>
										)}
									</div>
									<CardDescription>{plan.description}</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* 价格 */}
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-bold">¥{formatPrice(plan.price)}</span>
										{plan.originalPrice && plan.originalPrice > plan.price && (
											<span className="text-sm text-muted-foreground line-through">¥{formatPrice(plan.originalPrice)}</span>
										)}
										<span className="text-muted-foreground">/{billingCycle === "monthly" ? t("settings.subscription.billing.month") : billingCycle === "quarterly" ? t("settings.subscription.billing.quarter") : t("settings.subscription.billing.year")}</span>
									</div>

									{/* 订购按钮 */}
									<Button 
										variant="default" 
										className="w-full" 
										onClick={(e) => { 
											e.stopPropagation(); 
											handleSubscribe(plan.id); 
										}}
										disabled={creatingOrder === plan.id}
									>
										{creatingOrder === plan.id ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												{t("common.processing")}
											</>
										) : (
											t("settings.subscription.subscribe")
										)}
									</Button>

									{/* 可用模型 - 列出所有模型 */}
									<div className="pt-4">
										<p className="text-sm font-medium mb-2">{t("settings.subscription.availableModels")}</p>
										<div className="space-y-2">
											{plan.models && plan.models.length > 0 ? (
												plan.models.map((model: SubscribeModel) => (
													<div key={model.id} className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-2 min-w-0 flex-1">
															<Check className="h-4 w-4 text-green-500 flex-shrink-0" />
															<span className="text-sm truncate">{model.name}</span>
														</div>
														<span className="text-sm text-muted-foreground flex-shrink-0">
															{getUsageUnit(model, t)}
														</span>
													</div>
												))
											) : (
												<p className="text-sm text-muted-foreground">{t("settings.subscription.noModels")}</p>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">{t("settings.subscription.noPlans")}</p>
					</div>
				)}

				{/* 说明 */}
				<div className="mt-8 text-center text-sm text-muted-foreground">
					<p>{t("settings.subscription.terms")}</p>
				</div>
			</div>
		</SettingsPageLayout>
	);
}
