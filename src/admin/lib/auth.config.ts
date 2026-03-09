import { client } from "@/admin/db/sqlite";
import { createAuth } from "./auth";

// Just to create the required tables for Better Auth
// npx @better-auth/cli generate --config src/admin/lib/auth.config.ts --output src/admin/db/schemas/auth.ts
export const auth = createAuth(client);
