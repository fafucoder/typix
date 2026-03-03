import type { Config } from "drizzle-kit";

const config = {
	schema: "./src/server/db/schemas/index.ts",
	dialect: "mysql",
	casing: "snake_case",
	out: "./drizzle/migrations",
	dbCredentials: {
		host: process.env.MYSQL_HOST!,
		port: Number(process.env.MYSQL_PORT) || 3306,
		user: process.env.MYSQL_USER!,
		password: process.env.MYSQL_PASSWORD!,
		database: process.env.MYSQL_DATABASE!,
	},
} satisfies Config;

export default config;
