import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { useAuth } from "@/app/hooks/useAuth";
import { useUsageService } from "@/app/lib/service/usage";
import { SettingsPageLayout } from "@/app/routes/settings/-components/SettingsPageLayout";
import { ModelIcon } from "@lobehub/icons";
import { createFileRoute } from "@tanstack/react-router";
import ReactECharts from "echarts-for-react";
import { BarChart3, Calendar, Image, TrendingUp, Video } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings/usage")({
	component: UsagePage,
});

function UsagePage() {
	const { t } = useTranslation();
	const { isLogin } = useAuth();
	const usageService = useUsageService();
	const [usageTypeFilter, setUsageTypeFilter] = useState("all");
	const [dateRange, setDateRange] = useState("7days");

	const getDateRange = () => {
		const now = new Date();
		const endDate = now;
		let startDate: Date;

		switch (dateRange) {
			case "7days":
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case "30days":
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			case "90days":
				startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
				break;
			default:
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		}

		return { startDate, endDate };
	};

	const { startDate, endDate } = getDateRange();

	const { data: usageStats, isLoading: statsLoading } = usageService
		.getUserUsageStats()
		.swr(isLogin ? "usage-stats" : null);

	const { data: dailyUsage, isLoading: dailyLoading } = usageService
		.getUserDailyUsage({
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		})
		.swr(isLogin ? `daily-usage-${dateRange}` : null);

	const { data: usageDetails, isLoading: detailsLoading } = usageService
		.getUserUsageDetails({
			usageType: usageTypeFilter === "all" ? undefined : usageTypeFilter,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			limit: 50,
		})
		.swr(isLogin ? `usage-details-${usageTypeFilter}-${dateRange}` : null);

	const isLoading = statsLoading || dailyLoading || detailsLoading;

	const formatDate = (dateString: string | Date) => {
		const date = new Date(dateString);
		return date.toLocaleString("zh-CN", {
			timeZone: "Asia/Shanghai",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDateShort = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("zh-CN", {
			month: "2-digit",
			day: "2-digit",
		});
	};

	const generateLast7DaysData = () => {
		const days: { date: string; usageCount: number; totalCount: number }[] = [];
		const today = new Date();

		for (let i = 6; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0] || "";

			const existingData = dailyUsage?.find((d) => d.date === dateStr);

			days.push({
				date: dateStr,
				usageCount: existingData?.usageCount || 0,
				totalCount: existingData?.totalCount || 0,
			});
		}

		return days;
	};

	const chartData = generateLast7DaysData();

	const getUsageTypeBadge = (type: string) => {
		const typeMap: Record<
			string,
			{ label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }
		> = {
			text2image: {
				label: t("settings.usage.text2image"),
				variant: "default",
				icon: <Image className="mr-1 h-3 w-3" />,
			},
			text2video: {
				label: t("settings.usage.text2video"),
				variant: "secondary",
				icon: <Video className="mr-1 h-3 w-3" />,
			},
			image2image: {
				label: t("settings.usage.image2image"),
				variant: "outline",
				icon: <Image className="mr-1 h-3 w-3" />,
			},
		};
		const typeInfo = typeMap[type] || { label: type, variant: "outline", icon: null };
		return (
			<Badge variant={typeInfo.variant} className="flex items-center">
				{typeInfo.icon}
				{typeInfo.label}
			</Badge>
		);
	};

	const totalUsage = usageStats?.reduce((sum, stat) => sum + stat.usageCount, 0) || 0;

	if (isLoading) {
		return (
			<SettingsPageLayout>
				<div className="flex h-64 items-center justify-center">
					<div className="text-muted-foreground">{t("common.loading")}</div>
				</div>
			</SettingsPageLayout>
		);
	}

	return (
		<SettingsPageLayout>
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-3xl">{t("settings.usage.title")}</h1>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">{t("settings.usage.totalUsage")}</CardTitle>
							<BarChart3 className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-primary">{totalUsage}</div>
							<p className="text-muted-foreground text-xs">{t("settings.usage.totalUsageDesc")}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">{t("settings.usage.modelCount")}</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-primary">{usageStats?.length || 0}</div>
							<p className="text-muted-foreground text-xs">{t("settings.usage.modelCountDesc")}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">{t("settings.usage.todayUsage")}</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-primary">
								{dailyUsage?.find((d) => d.date === new Date().toISOString().split("T")[0])?.totalCount || 0}
							</div>
							<p className="text-muted-foreground text-xs">{t("settings.usage.todayUsageDesc")}</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>{t("settings.usage.modelStats")}</CardTitle>
					</CardHeader>
					<CardContent>
						{usageStats && usageStats.length > 0 ? (
							<div className="h-80 w-full">
								<ReactECharts
									option={{
										tooltip: {
											trigger: "axis",
											axisPointer: { type: "shadow" },
											backgroundColor: "rgba(255, 255, 255, 0.95)",
											borderColor: "#e5e7eb",
											borderWidth: 1,
											textStyle: { color: "#374151" },
										},
										legend: {
											data: [t("settings.usage.used"), t("settings.usage.remaining")],
											bottom: 0,
										},
										grid: {
											left: "3%",
											right: "4%",
											bottom: "15%",
											top: "10%",
											containLabel: true,
										},
										xAxis: {
											type: "category",
											data: usageStats.map((stat) => stat.model?.name || stat.modelId),
											axisLine: { lineStyle: { color: "#e5e7eb" } },
											axisLabel: {
												color: "#6b7280",
												interval: 0,
											},
										},
										yAxis: {
											type: "value",
											minInterval: 1,
											axisLine: { show: false },
											axisLabel: { color: "#6b7280" },
											splitLine: { lineStyle: { color: "#f3f4f6" } },
										},
										series: [
											{
												name: t("settings.usage.used"),
												type: "bar",
												stack: "total",
												data: usageStats.map((stat) => stat.usageCount),
												itemStyle: { color: "#3b82f6" },
												emphasis: {
													focus: "series",
													itemStyle: { shadowBlur: 10, shadowColor: "rgba(59, 130, 246, 0.5)" },
												},
											},
											{
												name: t("settings.usage.remaining"),
												type: "bar",
												stack: "total",
												data: usageStats.map((stat) => stat.remainingUsage),
												itemStyle: { color: "#10b981" },
												emphasis: {
													focus: "series",
													itemStyle: { shadowBlur: 10, shadowColor: "rgba(16, 185, 129, 0.5)" },
												},
											},
										],
									}}
									style={{ height: "100%", width: "100%" }}
									opts={{ renderer: "svg" }}
								/>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
								<p>{t("settings.usage.noUsageData")}</p>
								<p className="mt-2 text-sm">{t("settings.usage.noActiveOrderHint")}</p>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("settings.usage.dailyStats")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-80 w-full">
							<ReactECharts
								option={{
									tooltip: {
										trigger: "axis",
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										borderColor: "#e5e7eb",
										borderWidth: 1,
										textStyle: { color: "#374151" },
									},
									legend: {
										data: [t("settings.usage.usageCount"), t("settings.usage.totalCount")],
										bottom: 0,
									},
									grid: {
										left: "3%",
										right: "4%",
										bottom: "15%",
										top: "10%",
										containLabel: true,
									},
									xAxis: {
										type: "category",
										boundaryGap: false,
										data: chartData.map((day) => formatDateShort(day.date)),
										axisLine: { lineStyle: { color: "#e5e7eb" } },
										axisLabel: { color: "#6b7280" },
									},
									yAxis: {
										type: "value",
										minInterval: 1,
										axisLine: { show: false },
										axisLabel: { color: "#6b7280" },
										splitLine: { lineStyle: { color: "#f3f4f6" } },
									},
									series: [
										{
											name: t("settings.usage.usageCount"),
											type: "line",
											smooth: true,
											data: chartData.map((day) => day.usageCount),
											areaStyle: {
												color: {
													type: "linear",
													x: 0,
													y: 0,
													x2: 0,
													y2: 1,
													colorStops: [
														{ offset: 0, color: "rgba(59, 130, 246, 0.3)" },
														{ offset: 1, color: "rgba(59, 130, 246, 0.05)" },
													],
												},
											},
											lineStyle: { color: "#3b82f6", width: 2 },
											itemStyle: { color: "#3b82f6" },
											emphasis: {
												focus: "series",
												itemStyle: { shadowBlur: 10, shadowColor: "rgba(59, 130, 246, 0.5)" },
											},
										},
										{
											name: t("settings.usage.totalCount"),
											type: "line",
											smooth: true,
											data: chartData.map((day) => day.totalCount),
											areaStyle: {
												color: {
													type: "linear",
													x: 0,
													y: 0,
													x2: 0,
													y2: 1,
													colorStops: [
														{ offset: 0, color: "rgba(16, 185, 129, 0.3)" },
														{ offset: 1, color: "rgba(16, 185, 129, 0.05)" },
													],
												},
											},
											lineStyle: { color: "#10b981", width: 2 },
											itemStyle: { color: "#10b981" },
											emphasis: {
												focus: "series",
												itemStyle: { shadowBlur: 10, shadowColor: "rgba(16, 185, 129, 0.5)" },
											},
										},
									],
								}}
								style={{ height: "100%", width: "100%" }}
								opts={{ renderer: "svg" }}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<CardTitle>{t("settings.usage.usageDetails")}</CardTitle>
							<div className="flex gap-2">
								<Select value={usageTypeFilter} onValueChange={setUsageTypeFilter}>
									<SelectTrigger className="w-36">
										<SelectValue placeholder={t("settings.usage.typeFilter")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("settings.usage.allTypes")}</SelectItem>
										<SelectItem value="text2image">{t("settings.usage.text2image")}</SelectItem>
										<SelectItem value="text2video">{t("settings.usage.text2video")}</SelectItem>
									</SelectContent>
								</Select>
								<Select value={dateRange} onValueChange={setDateRange}>
									<SelectTrigger className="w-34">
										<SelectValue placeholder={t("settings.usage.dateRange")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="7days">{t("settings.usage.last7Days")}</SelectItem>
										<SelectItem value="30days">{t("settings.usage.last30Days")}</SelectItem>
										<SelectItem value="90days">{t("settings.usage.last90Days")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{usageDetails && usageDetails.length > 0 ? (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>{t("settings.usage.model")}</TableHead>
											<TableHead>{t("settings.usage.type")}</TableHead>
											<TableHead>{t("settings.usage.count")}</TableHead>
											<TableHead>{t("settings.usage.time")}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{usageDetails.map((detail) => (
											<TableRow key={detail.id}>
												<TableCell>
													<div className="flex items-center gap-2">
														<Suspense
															fallback={
																<div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
																	<Sparkles className="h-3 w-3 text-muted-foreground" />
																</div>
															}
														>
															<div className="flex h-6 w-6 items-center justify-center overflow-hidden">
																<ModelIcon model={detail.model?.name || detail.modelId} size={20} type="color" />
															</div>
														</Suspense>
														<span className="text-sm">{detail.model?.name || detail.modelId}</span>
													</div>
												</TableCell>
												<TableCell>{getUsageTypeBadge(detail.usageType)}</TableCell>
												<TableCell>
													<span className="font-medium">{detail.count}</span>
												</TableCell>
												<TableCell className="text-muted-foreground">{formatDate(detail.createdAt)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						) : (
							<div className="py-8 text-center text-muted-foreground">{t("settings.usage.noUsageData")}</div>
						)}
					</CardContent>
				</Card>
			</div>
		</SettingsPageLayout>
	);
}
