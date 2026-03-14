import { SettingsPageLayout } from "@/app/routes/settings/-components/SettingsPageLayout";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrderService } from "@/app/lib/service/order";
import { useSubscribeService } from "@/app/lib/service/subscribe";
import type { OrderWithDetails } from "@/app/lib/api/order";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/hooks/useAuth";
import { Package, Search, Eye, MoreVertical, Sparkles, X } from "lucide-react";
import { ModelIcon } from "@lobehub/icons";
import { Suspense } from "react";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

export const Route = createFileRoute("/settings/orders")({
	component: OrdersPage,
});

function OrdersPage() {
	const { t } = useTranslation();
	const { isLogin } = useAuth();
	const [page, setPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
	const [showDetailDialog, setShowDetailDialog] = useState(false);
	const pageSize = 10; // 十条一个分页
	const orderService = useOrderService();
	const subscribeService = useSubscribeService();

	// 获取订单数据
		const { data: ordersData, isLoading: ordersLoading, error: ordersError } = orderService.getOrders(page, pageSize, searchTerm, statusFilter).swr(isLogin ? `orders-${page}-${searchTerm}-${statusFilter}` : null);
	
	// 获取当前订阅状态
	const { data: currentSubscription, isLoading: subscribeLoading, error: subscribeError } = subscribeService.getCurrentSubscription.swr(isLogin ? "current-subscription" : null);

	const formatPrice = (price: number) => {
		return (price / 100).toFixed(2);
	};

	const formatDate = (dateString: string | Date) => {
		const date = new Date(dateString);
		return date.toLocaleString("zh-CN", {
			timeZone: "Asia/Shanghai"
		});
	};

	const getStatusBadge = (status: string) => {
		const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
			pending: { label: t("settings.orders.pending"), variant: "outline" },
			paid: { label: t("settings.orders.paid"), variant: "default" },
			cancelled: { label: t("settings.orders.cancelled"), variant: "secondary" },
			refunded: { label: t("settings.orders.refunded"), variant: "secondary" },
			expired: { label: t("settings.orders.expired"), variant: "destructive" },
		};
		const statusInfo = statusMap[status] || { label: status, variant: "outline" };
		return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
	};

	const handleCancelOrder = async (orderId: string) => {
		try {
			await orderService.cancelOrder(orderId);
			window.location.reload();
		} catch (error) {
			console.error(t("settings.orders.cancel") + ":", error);
		}
	};

	const handleViewDetail = (order: OrderWithDetails) => {
		setSelectedOrder(order);
		setShowDetailDialog(true);
	};

	const isLoading = ordersLoading || subscribeLoading;
	const error = ordersError || subscribeError;

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
					<div className="text-red-500">{t("common.error")}: {(error as any).message}</div>
				</div>
			</SettingsPageLayout>
		);
	}

	// 计算服务周期
	const getServicePeriod = (order: OrderWithDetails) => {
		if (!order.subscribe?.duration) return "-";
		const startDate = new Date(order.createdAt);
		const endDate = order.expiresAt ? new Date(order.expiresAt) : new Date(startDate.getTime() + order.subscribe.duration * 24 * 60 * 60 * 1000);
		return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} ${t("settings.orders.to")} ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
	};

	// 计算账单日期
	const getBillDate = (order: OrderWithDetails) => {
		return formatDate(order.createdAt);
	};

	// 计算到期日期
	const getExpiryDate = (order: OrderWithDetails) => {
		if (order.expiresAt) {
			return formatDate(order.expiresAt);
		} else if (order.subscribe?.duration) {
			const endDate = new Date(new Date(order.createdAt).getTime() + order.subscribe.duration * 24 * 60 * 60 * 1000);
			return formatDate(endDate);
		}
		return "-";
	};

	return (
		<SettingsPageLayout>
			<div className="space-y-8">
				{/* 页面标题 */}
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">{t("settings.orders.title")}</h1>
				</div>

				{/* 当前套餐 */}
				<div className="space-y-4">
					{currentSubscription ? (
						<>
							<Card>
								<CardContent className="p-6">
									<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
										<div className="flex items-start gap-4">
											<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
												<Package className="w-8 h-8 text-primary" />
											</div>
											<div>
												<h3 className="text-xl font-semibold">{currentSubscription.name}</h3>
												<div className="mt-2 space-y-1 text-sm text-muted-foreground">
													<p>
														<span className="font-medium text-foreground">{t("settings.orders.validPeriod")}：</span>
														{formatDate(currentSubscription.startDate)} - {formatDate(currentSubscription.endDate)}
													</p>
													<p>
														<span className="font-medium text-foreground">{t("settings.orders.planDuration")}：</span>
														{currentSubscription.duration} {t("settings.orders.planDurationDays")}
													</p>
												</div>
											</div>
										</div>
										
										<div className="flex items-center">
											<Button asChild variant="default">
												<Link to="/settings/subscription">{t("settings.subscription.manage")}</Link>
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
							
							<Card>
								<CardHeader className="pb-2">
									<CardTitle>{t("settings.orders.availableModels")}</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
										{currentSubscription.models && currentSubscription.models.length > 0 ? (
											currentSubscription.models.map((model) => (
												<div key={model.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
													<Suspense fallback={
														<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
															<Sparkles className="w-4 h-4 text-muted-foreground" />
														</div>
													}>
														<div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden">
															<ModelIcon
																model={model.name || model.id}
																size={28}
																type="color"
															/>
														</div>
													</Suspense>
													<div className="flex-1 min-w-0">
														<span className="text-sm font-medium block truncate">{model.name}</span>
														<span className="text-xs text-muted-foreground">
															{model.maxUsage === 0 ? t("settings.orders.unlimited") : `${model.maxUsage.toLocaleString()} ${t("settings.orders.times")}`}
														</span>
													</div>
												</div>
											))
										) : (
											<p className="text-sm text-muted-foreground col-span-full text-center py-4">{t("settings.orders.noModelInfo")}</p>
										)}
									</div>
								</CardContent>
							</Card>
						</>
					) : (
						<Card>
							<CardContent className="p-8">
								<div className="flex flex-col items-center justify-center text-center space-y-4">
									<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
										<Package className="w-8 h-8 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-medium">{t("settings.subscription.noSubscription")}</h3>
									<p className="text-muted-foreground">{t("settings.subscription.noSubscriptionDescription")}</p>
									<Button asChild variant="default">
										<Link to="/settings/subscription">{t("settings.subscription.choosePlan")}</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* 搜索和筛选 */}
				<div className="flex flex-col sm:flex-row gap-4 mb-6">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
						<Input
							type="text"
							placeholder={t("settings.orders.searchPlaceholder")}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder={t("settings.orders.statusFilter")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("settings.orders.allStatus")}</SelectItem>
							<SelectItem value="pending">{t("settings.orders.pending")}</SelectItem>
							<SelectItem value="paid">{t("settings.orders.paid")}</SelectItem>
							<SelectItem value="cancelled">{t("settings.orders.cancelled")}</SelectItem>
							<SelectItem value="refunded">{t("settings.orders.refunded")}</SelectItem>
							<SelectItem value="expired">{t("settings.orders.expired")}</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* 账单历史表格 */}
				<div className="space-y-4">
					{ordersData?.orders && ordersData.orders.length > 0 ? (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("settings.orders.orderNo")}</TableHead>
										<TableHead>{t("settings.orders.planName")}</TableHead>
										<TableHead>{t("settings.orders.billDate")}</TableHead>
										<TableHead>{t("settings.orders.expiryDate")}</TableHead>
										<TableHead>{t("settings.orders.amount")}</TableHead>
										<TableHead>{t("settings.orders.status")}</TableHead>
										<TableHead>{t("settings.orders.actions")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{ordersData.orders.map((order: OrderWithDetails) => (
										<TableRow key={order.id}>
											<TableCell>{order.orderNo}</TableCell>
												<TableCell>{order.subscribe?.name || "-"}</TableCell>
												<TableCell>{getBillDate(order)}</TableCell>
												<TableCell>{getExpiryDate(order)}</TableCell>
											<TableCell>¥{formatPrice(order.actualAmount)}</TableCell>
											<TableCell>{getStatusBadge(order.status)}</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
															<MoreVertical size={16} />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleViewDetail(order)}>
															<Eye size={16} className="mr-2" />
															{t("settings.orders.viewDetail")}
														</DropdownMenuItem>
														{order.status === "pending" && (
															<>
																<DropdownMenuItem>
																	{t("settings.orders.goToPay")}
																</DropdownMenuItem>
																<DropdownMenuItem onClick={() => handleCancelOrder(order.id)}>
																	{t("settings.orders.cancel")}
																</DropdownMenuItem>
															</>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<Card>
							<CardContent className="p-8">
								<div className="flex flex-col items-center justify-center text-center space-y-4">
									<div className="text-muted-foreground">
										<Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
										<p>{t("settings.orders.noOrders")}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* 分页 */}
				{ordersData && ordersData.total > pageSize && (
					<div className="flex justify-center mt-8">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious onClick={() => setPage(page - 1)} disabled={page === 1} />
								</PaginationItem>
								{Array.from({ length: Math.ceil(ordersData.total / pageSize) }, (_, i) => i + 1).map((pageNum) => (
									<PaginationItem key={pageNum}>
										<PaginationLink 
											onClick={() => setPage(pageNum)}
											className={page === pageNum ? "bg-primary text-primary-foreground" : ""}
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								))}
								<PaginationItem>
									<PaginationNext onClick={() => setPage(page + 1)} disabled={page * pageSize >= ordersData.total} />
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</div>

			{/* 订单详情对话框 */}
			<Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("settings.orders.orderDetail")}</DialogTitle>
					</DialogHeader>
					{selectedOrder && (
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle>{t("settings.orders.basicInfo")}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex justify-between">
										<span className="text-muted-foreground">{t("settings.orders.orderNo")}</span>
										<span className="font-medium">{selectedOrder.orderNo}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">{t("settings.orders.orderStatus")}</span>
										{getStatusBadge(selectedOrder.status)}
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">{t("settings.orders.orderType")}</span>
										<span>{selectedOrder.type === "subscription" ? t("settings.orders.subscription") : t("settings.orders.credits")}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">{t("settings.orders.createdAt")}</span>
										<span>{formatDate(selectedOrder.createdAt)}</span>
									</div>
									{selectedOrder.expiresAt && (
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.expiresAt")}</span>
											<span>{formatDate(selectedOrder.expiresAt)}</span>
										</div>
									)}
								</CardContent>
							</Card>

							{selectedOrder.subscribe && (
								<Card>
									<CardHeader>
										<CardTitle>{t("settings.orders.planInfo")}</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.planName")}</span>
											<span className="font-medium">{selectedOrder.subscribe.name}</span>
										</div>
										{selectedOrder.subscribe.description && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">{t("settings.orders.planDescription")}</span>
												<span>{selectedOrder.subscribe.description}</span>
											</div>
										)}
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.planDuration")}</span>
											<span>{selectedOrder.subscribe.duration} {t("settings.orders.planDurationDays")}</span>
										</div>
									</CardContent>
								</Card>
							)}

							<Card>
								<CardHeader>
									<CardTitle>{t("settings.orders.amountInfo")}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex justify-between">
										<span className="text-muted-foreground">{t("settings.orders.originalPrice")}</span>
										<span>¥{formatPrice(selectedOrder.totalAmount)}</span>
									</div>
									{selectedOrder.discountAmount > 0 && (
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.discountAmount")}</span>
											<span className="text-red-500">-¥{formatPrice(selectedOrder.discountAmount)}</span>
										</div>
									)}
									<div className="flex justify-between text-lg font-medium">
										<span>{t("settings.orders.paidAmount")}</span>
										<span className="text-primary">¥{formatPrice(selectedOrder.actualAmount)}</span>
									</div>
								</CardContent>
							</Card>

							{selectedOrder.coupon && (
								<Card>
									<CardHeader>
										<CardTitle>{t("settings.orders.couponInfo")}</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.couponCode")}</span>
											<span className="font-medium">{selectedOrder.coupon.code}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t("settings.orders.couponName")}</span>
											<span>{selectedOrder.coupon.name}</span>
										</div>
										{selectedOrder.coupon.description && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">{t("settings.orders.couponDescription")}</span>
												<span>{selectedOrder.coupon.description}</span>
											</div>
										)}
									</CardContent>
								</Card>
							)}

							{selectedOrder.payments && selectedOrder.payments.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle>{t("settings.orders.paymentRecords")}</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{selectedOrder.payments.map((payment) => (
												<div key={payment.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
													<div>
														<div className="font-medium">{t("settings.orders.paymentAmount")}: ¥{formatPrice(payment.amount)}</div>
														{payment.processedAt && (
															<div className="text-sm text-muted-foreground">
																{formatDate(payment.processedAt)}
															</div>
														)}
													</div>
													<Badge>{payment.status}</Badge>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}

							{selectedOrder.remark && (
								<Card>
									<CardHeader>
										<CardTitle>{t("settings.orders.remark")}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground">{selectedOrder.remark}</p>
									</CardContent>
								</Card>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</SettingsPageLayout>
	);
}
