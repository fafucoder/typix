import { inCfWorker } from "@/server/lib/env";
import * as schema from "./schemas";

export const createDb = async (client: any) => {
	if (inCfWorker) {
		const d1Module = await import("drizzle-orm/d1");
		const drizzle = d1Module.drizzle;
		return drizzle(client, { schema, casing: "snake_case" });
	}
	const mysql2Module = await import("drizzle-orm/mysql2");
	const drizzle = mysql2Module.drizzle;
	const { pool } = await import("./mysql");
	return drizzle(pool, {
		casing: "snake_case",
		logger: process.env.NODE_ENV === "development" ? true : undefined,
		schema: schema as any,
		mode: "default",
	});
};

export type DrizzleDb = Awaited<ReturnType<typeof createDb>>;
