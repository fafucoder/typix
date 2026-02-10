import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { getDb } from "@/app/lib/db-client";
import { SettingsPageLayout } from "@/app/routes/settings/-components/SettingsPageLayout";
import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface QueryResult {
	columns?: string[];
	rows?: Record<string, any>[];
	changes?: number;
	lastInsertRowid?: number | bigint;
	error?: string;
	executionTime?: number;
}

export const Route = createFileRoute("/settings/database")({
	component: DatabaseSettingsPage,
});

function DatabaseSettingsPage() {
	const { t } = useTranslation();
	const [sql, setSql] = useState("");
	const [result, setResult] = useState<QueryResult | null>(null);
	const [isExecuting, setIsExecuting] = useState(false);

	const executeSql = async () => {
		if (!sql.trim()) {
			toast.error(t("common.error"));
			return;
		}

		setIsExecuting(true);
		const startTime = performance.now();

		try {
			const db = getDb();

			const isSelectQuery = sql.trim().toLowerCase().startsWith("select");

			if (isSelectQuery) {
				const selectResult = (await db.all(sql.trim())) as Record<string, any>[];
				const executionTime = performance.now() - startTime;

				if (Array.isArray(selectResult) && selectResult.length > 0) {
					const firstRow = selectResult[0];
					if (firstRow) {
						const columns = Object.keys(firstRow);
						setResult({
							columns,
							rows: selectResult,
							executionTime,
						});
					} else {
						setResult({
							columns: [],
							rows: [],
							executionTime,
						});
					}
				} else {
					setResult({
						columns: [],
						rows: [],
						executionTime,
					});
				}
			} else {
				const queryResult = (await db.run(sql.trim())) as any;
				const executionTime = performance.now() - startTime;

				setResult({
					changes: queryResult.changes || 0,
					lastInsertRowid: queryResult.lastInsertRowid,
					executionTime,
				});
			}

			toast.success(t("common.success"));
		} catch (error) {
			const executionTime = performance.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : t("common.unknown");

			setResult({
				error: errorMessage,
				executionTime,
			});

			toast.error(errorMessage);
		} finally {
			setIsExecuting(false);
		}
	};

	const clearResult = () => {
		setResult(null);
	};

	return (
		<SettingsPageLayout maxWidthFit={true}>
			<div className="space-y-6">
				<div className="flex items-center gap-2">
					<Database className="h-5 w-5" />
					<h2 className="font-semibold text-lg">{t("settings.sections.database")}</h2>
				</div>

				<p className="text-muted-foreground text-sm">
					SQL query tool for debugging, supports all standard SQLite statements
				</p>

				<div className="space-y-4">
					<div>
						<label htmlFor="sql-input" className="mb-2 block font-medium text-sm">
							SQL Query Statement
						</label>
						<Textarea
							id="sql-input"
							placeholder="Enter SQL query statement, e.g.: SELECT * FROM chats; (Ctrl+Enter to execute)"
							value={sql}
							onChange={(e) => setSql(e.target.value)}
							onKeyDown={(e) => {
								if (e.ctrlKey && e.key === "Enter") {
									e.preventDefault();
									if (!isExecuting && sql.trim()) {
										executeSql();
									}
								}
							}}
							className="h-[200px] resize-none font-mono text-sm"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Button onClick={executeSql} disabled={isExecuting || !sql.trim()} className="flex-shrink-0">
							{isExecuting ? "Executing..." : "Execute Query"}
						</Button>

						<Button variant="outline" onClick={() => setSql("")} disabled={!sql.trim()}>
							Clear
						</Button>

						<Button variant="outline" onClick={clearResult} disabled={!result}>
							Clear Results
						</Button>
					</div>
				</div>

				{result ? (
					<div className="rounded-lg border">
						<div className="flex items-center justify-between border-b p-4">
							<h3 className="font-semibold">Query Results</h3>
							<div className="flex items-center gap-2">
								{result.executionTime && <Badge variant="secondary">{result.executionTime.toFixed(2)}ms</Badge>}
							</div>
						</div>

						<div className="p-4">
							{result.error ? (
								<div className="rounded-md border border-destructive/20 bg-destructive/10 p-4">
									<p className="font-medium text-destructive">Error:</p>
									<p className="mt-1 text-destructive/80 text-sm">{result.error}</p>
								</div>
							) : result.columns && result.rows ? (
								<div className="space-y-4">
									<div className="flex items-center gap-4">
										<Badge variant="outline">{result.rows.length} rows</Badge>
										<Badge variant="outline">{result.columns.length} columns</Badge>
									</div>

									<div className="w-full overflow-x-auto">
										<table className="w-full text-sm">
											<thead className="border-b bg-muted/50">
												<tr>
													{result.columns.map((column) => (
														<th key={column} className="border-r p-4 text-left font-medium last:border-r-0">
															{column}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{result.rows.map((row, rowIndex) => (
													<tr key={`row-${JSON.stringify(row)}-${rowIndex}`} className="border-b hover:bg-muted/50">
														{result.columns!.map((column) => (
															<td key={`${rowIndex}-${column}`} className="border-r p-4 last:border-r-0">
																{row[column] !== null && row[column] !== undefined ? (
																	<div className="truncate" title={String(row[column])}>
																		{String(row[column])}
																	</div>
																) : (
																	<span className="text-muted-foreground italic">NULL</span>
																)}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className="flex items-center gap-4">
									{typeof result.changes === "number" && (
										<Badge variant="outline">Affected rows: {result.changes}</Badge>
									)}
									{result.lastInsertRowid && (
										<Badge variant="outline">Insert ID: {String(result.lastInsertRowid)}</Badge>
									)}
									<p className="text-muted-foreground">Query execution completed</p>
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
						<p>SQL query results will be displayed here after execution</p>
					</div>
				)}
			</div>
		</SettingsPageLayout>
	);
}
