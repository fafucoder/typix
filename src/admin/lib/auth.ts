import { scryptSync, getRandomValues } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "./email";
import { admin as adminTable, adminSession, adminAccount, adminVerification } from "@/admin/db/schemas/admin";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

export interface AuthConfig {
	email: {
		verification: boolean;
		resend: {
			apiKey: string;
			from: string;
		};
	};
	social: {
		google: {
			enabled: boolean;
			clientId: string;
			clientSecret: string;
		};
		github: {
			enabled: boolean;
			clientId: string;
			clientSecret: string;
		};
	};
	cookieDomain?: string;
}

export const hashPassword = async (password: string): Promise<string> => {
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

export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
	const [saltHex, keyHex] = hash.split(":");

	const targetKey = scryptSync(password.normalize("NFKC"), saltHex!, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2,
	});

	const targetKeyHex = Array.from(targetKey)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return targetKeyHex === keyHex;
};

export const createAuth = (db: any, config?: AuthConfig) =>
	betterAuth({
		database: drizzleAdapter(db, {
			provider: "mysql",
			schema: {
				user: adminTable,
				session: adminSession,
				account: adminAccount,
				verification: adminVerification,
			},
		}),
		...(config?.cookieDomain
			? {
				advanced: {
					crossSubDomainCookies: {
						enabled: true,
						domain: config.cookieDomain,
					},
				},
			}
			: {}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: config?.email?.verification === true,
			password: {
				hash: async (password) => {
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
				},
				verify: async ({ hash, password }) => {
					const [saltHex, keyHex] = hash.split(":");

					const targetKey = scryptSync(password.normalize("NFKC"), saltHex!, 64, {
						N: 16384,
						r: 16,
						p: 1,
						maxmem: 128 * 16384 * 16 * 2,
					});

					const targetKeyHex = Array.from(targetKey)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					return targetKeyHex === keyHex;
				},
			},
		},
		emailVerification: {
			autoSignInAfterVerification: true,
		},
		plugins: [
			emailOTP({
				overrideDefaultEmailVerification: true,
				async sendVerificationOTP({ email, otp, type }) {
					console.log(`Sending ${type} OTP to ${email}: ${otp} ${type}`);
					await sendEmail(email, otp);
				},
			}),
		],
		socialProviders: {
			google:
				config?.social.google.enabled === true
					? {
						clientId: config.social.google.clientId,
						clientSecret: config.social.google.clientSecret,
					}
					: undefined,
			github:
				config?.social.github.enabled === true
					? {
						clientId: config.social.github.clientId,
						clientSecret: config.social.github.clientSecret,
					}
					: undefined,
		},
	});
