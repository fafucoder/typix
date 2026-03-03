import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { scryptSync, getRandomValues } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { user, account, admin } from "../src/server/db/schemas/index.js";
const hashPassword = async (password: string): Promise<string> => {
	const salt = getRandomValues(new Uint8Array(16));
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	const key = scryptSync(password.normalize("NFKC"), saltHex, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2,
	});

	const keyHex = Array.from(key)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${saltHex}:${keyHex}`;
};

const generateId = (): string => {
	return randomBytes(16).toString("hex");
};

const initEnv = () => {
	config();
}
async function createInitialAdmin() {
	initEnv();

	const connection = await mysql.createConnection({
		host: process.env.MYSQL_HOST,
		port: Number(process.env.MYSQL_PORT),
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD,
		database: process.env.MYSQL_DATABASE,
	});

	const db = drizzle(connection);

	const email = process.env.ADMIN_EMAIL || "admin@typix.com";
	const password = process.env.ADMIN_PASSWORD || "admin123456";
	const name = process.env.ADMIN_NAME || "Admin";

	try {
		console.log(`Creating initial admin user: ${email}`);

		const userId = generateId();
		const adminId = generateId();
		const accountId = generateId();
		const hashedPassword = await hashPassword(password);

		await db.insert(user).values({
			id: userId,
			name: name,
			email: email,
			role: "admin",
			emailVerified: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await db.insert(account).values({
			id: accountId,
			accountId: userId,
			providerId: "credential",
			userId: userId,
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await db.insert(admin).values({
			id: adminId,
			userId: userId,
			department: "Administration",
			permissions: ["all"],
			status: "active",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		console.log("✅ Initial admin user created successfully!");
		console.log(`   Email: ${email}`);
		console.log(`   Password: ${password}`);
		console.log(`   Admin ID: ${adminId}`);
	} catch (error: any) {
		if (error.code === "ER_DUP_ENTRY") {
			console.log("⚠️  Admin user already exists");
		} else {
			console.error("❌ Error creating admin user:", error);
		}
	} finally {
		await connection.end();
	}
}

createInitialAdmin();
