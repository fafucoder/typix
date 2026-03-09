import type { Config } from "drizzle-kit";

const baseConfig = {
	dialect: "mysql" as const,
	casing: "snake_case" as const,
	dbCredentials: {
		host: process.env.MYSQL_HOST!,
		port: Number(process.env.MYSQL_PORT) || 3306,
		user: process.env.MYSQL_USER!,
		password: process.env.MYSQL_PASSWORD!,
		database: process.env.MYSQL_DATABASE!,
	},
};

// Server schema
export const serverConfig = {
	...baseConfig,
	schema: "./src/server/db/schemas/index.ts",
	out: "./drizzle/migrations",
} satisfies Config;

// Admin schema
export const adminConfig = {
	...baseConfig,
	schema: "./src/admin/db/schemas/index.ts",
	out: "./drizzle/admin-migrations",
} satisfies Config;

const target = process.env.DRIZZLE_TARGET || "server";
const config = target === "admin" ? adminConfig : serverConfig;

export default config;
