import { mysqlTable, varchar, int, timestamp, text } from "drizzle-orm/mysql-core";

const userRoles = ["admin", "user"] as const;
export type UserRole = (typeof userRoles)[number];

export const user = mysqlTable("user", {
	id: varchar("id", { length: 255 }).primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: int("email_verified")
		.default(0)
		.notNull(),
	image: text("image"),
	role: varchar("role", { length: 10, enum: userRoles }).$defaultFn(() => "user").notNull(),
	inviteCode: varchar("invite_code", { length: 255 }).unique(),
	parentUserId: varchar("parent_user_id", { length: 255 }),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = mysqlTable("session", {
	id: varchar("id", { length: 255 }).primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: varchar("token", { length: 255 }).notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: varchar("ip_address", { length: 255 }),
	userAgent: text("user_agent"),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = mysqlTable("account", {
	id: varchar("id", { length: 255 }).primaryKey(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	providerId: varchar("provider_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = mysqlTable("verification", {
	id: varchar("id", { length: 255 }).primaryKey(),
	identifier: varchar("identifier", { length: 255 }).notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()),
});
