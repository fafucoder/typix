import { scryptSync, getRandomValues } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "./email";
import { user as userTable, account, session, verification } from "../db/schemas/auth";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

export interface AuthConfig {
	baseURL?: string;
	cookieDomain?: string;
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
}

function generateInviteCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 8; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

async function validateInviteCode(db: any, inviteCode: string) {
	const inviter = await db.select()
		.from(userTable)
		.where(eq(userTable.inviteCode, inviteCode))
		.get();
	return inviter;
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
		baseURL: config?.baseURL,
		database: drizzleAdapter(db, {
			provider: "mysql",
			schema: {
				user: userTable,
				session: session,
				account: account,
				verification: verification,
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
			// Custom password hashing function to avoid cloudflare workers cpu limitations, see: https://github.com/better-auth/better-auth/issues/969
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
		hooks: {
			before: async (inputContext: any) => {
				const isSignUp = inputContext.path.includes('sign-up');
				if (!isSignUp) return inputContext;

				const inviteCode = inputContext.body.inviteCode;
				if (!inviteCode) return inputContext;

				const inviter = await validateInviteCode(db, inviteCode);
				if (!inviter) {
					throw new APIError("BAD_REQUEST", { message: "INVALID_INVITE_CODE" });
				}

				return inputContext;
			},
			after: async (inputContext: any) => {
				const isSignUp = inputContext.path.includes('sign-up');
				if (!isSignUp || !inputContext.context?.returned?.user) return inputContext;

				const user = inputContext.context.returned.user;
				const inviteCode = inputContext.body.inviteCode;
				const newInviteCode = generateInviteCode();

				try {
					if (inviteCode) {
						const inviter = await validateInviteCode(db, inviteCode);
						if (!inviter) {
							await db.delete(userTable).where(eq(userTable.id, user.id));
							throw new APIError("BAD_REQUEST", { message: "INVALID_INVITE_CODE" });
						}

						await db.update(userTable).set({ inviteCode: newInviteCode, parentUserId: inviter.id }).where(eq(userTable.id, user.id));
					} else {
						await db.update(userTable).set({ inviteCode: newInviteCode }).where(eq(userTable.id, user.id));
					}

				} catch (error) {
					if (error instanceof APIError) throw error;
					console.error('after hook - error generating invite code:', error);
				}

				return inputContext;
			},
		},
		/*  
		emailVerification: {
			sendVerificationEmail: async ({ user, url, token }, request) => {
				console.log(`Sending verification email to ${user.email}`, url);
				await sendEmail(user.email, url);
			},
		}, 
		*/
		emailVerification: {
			autoSignInAfterVerification: true,
		},
		plugins: [
			emailOTP({
				overrideDefaultEmailVerification: true,
				async sendVerificationOTP({ email, otp, type }) {
					// Implement the sendVerificationOTP method to send the OTP to the user's email address
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
