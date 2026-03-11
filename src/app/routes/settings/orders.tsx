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
import { Package, Search, Eye, MoreVertical } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";

export const Route = createFileRoute("/settings/orders")({
	component: OrdersPage,
});

function OrdersPage() {
	const { t } = useTranslation();
	const { isLogin } = useAuth();
	const [page, setPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
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
			pending: { label: "待支付", variant: "outline" },
			paid: { label: "已支付", variant: "default" },
			cancelled: { label: "已取消", variant: "secondary" },
			refunded: { label: "已退款", variant: "secondary" },
			expired: { label: "已过期", variant: "destructive" },
		};
		const statusInfo = statusMap[status] || { label: status, variant: "outline" };
		return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
	};

	const handleCancelOrder = async (orderId: string) => {
		try {
			await orderService.cancelOrder(orderId);
			window.location.reload();
		} catch (error) {
			console.error("取消订单失败:", error);
		}
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
		return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} 至 ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
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
						<Card>
							<CardContent className="p-6">
								<div className="flex flex-col items-center justify-center text-center space-y-4">
									<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
										<Package className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-xl font-semibold">{currentSubscription?.name || ''}</h3>
									<p className="text-muted-foreground">
										{currentSubscription?.endDate ? 
											`${t("settings.subscription.expiresAt")}: ${formatDate(currentSubscription.endDate)}` : 
											''
										}
									</p>
									<Button asChild variant="default">
										<Link to="/settings/subscription">{t("settings.subscription.manage")}</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
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
										<TableHead>订单号</TableHead>
										<TableHead>套餐名称</TableHead>
										<TableHead>账单日期</TableHead>
										<TableHead>到期日期</TableHead>
										<TableHead>金额</TableHead>
										<TableHead>状态</TableHead>
										<TableHead>操作</TableHead>
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
														<DropdownMenuItem>
															<Eye size={16} className="mr-2" />
															查看详情
														</DropdownMenuItem>
														{order.status === "pending" && (
															<>
																<DropdownMenuItem>
																	去支付
																</DropdownMenuItem>
																<DropdownMenuItem onClick={() => handleCancelOrder(order.id)}>
																	取消订单
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
		</SettingsPageLayout>
	);
}
