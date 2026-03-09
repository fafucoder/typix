import { createPool, type Pool } from "mysql2/promise";

/**
 * Cache the database connection pool in development. This avoids creating a new pool on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
	pool: Pool | undefined;
};

export const pool = globalForDb.pool ?? createPool({
	host: process.env.MYSQL_HOST!,
	port: Number(process.env.MYSQL_PORT) || 3306,
	user: process.env.MYSQL_USER!,
	password: process.env.MYSQL_PASSWORD!,
	database: process.env.MYSQL_DATABASE!,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
