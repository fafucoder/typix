import fs from "node:fs";
import path from "node:path";
import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import TOML from "smol-toml";
import { defineConfig, loadEnv } from "vite";

function readWranglerConfig() {
	try {
		const wranglerPath = path.resolve(__dirname, "wrangler.toml");
		if (fs.existsSync(wranglerPath)) {
			const content = fs.readFileSync(wranglerPath, "utf-8");
			const config = TOML.parse(content) as any;
			return config.vars || {};
		}
	} catch (error) {
		console.warn("Failed to read wrangler.toml:", error);
	}
	return {};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const wranglerVars = readWranglerConfig();

	function getEnv(key: string, defaultValue?: string): string | undefined {
		const envValue = process.env[key] || env[key] || wranglerVars[key];
		if (envValue !== undefined) {
			return JSON.stringify(envValue);
		}
		if (defaultValue !== undefined) {
			return JSON.stringify(defaultValue);
		}
		return undefined;
	}

	return {
		root: "./src/web",
		publicDir: "../../public",
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				routesDirectory: "./routes",
				generatedRouteTree: "./routeTree.gen.ts",
			}),
			react(),
			tailwindcss(),
			devServer({
				entry: "./src/admin/index.ts",
				exclude: [
					/.*\.tsx?($|\?)/,
					/.*\.(s?css|less)($|\?)/,
					/.*\.(svg|png)($|\?)/,
					/.*\.json($|\?)/,
					/.*\.sql($|\?)/,
					/^\/@.+$/,
					/^\/favicon\.ico$/,
					/^\/(public|assets|static)\/.+/,
					/^\/node_modules\/.*/,
				],
				injectClientScript: false,
			}),
		],
		resolve: {
			alias: [
				{ find: "@/admin", replacement: path.resolve(__dirname, "./src/admin") },
				{ find: "@", replacement: path.resolve(__dirname, "./src/web") },
			],
		},
		define: {
			"import.meta.env.RUNTIME": getEnv("RUNTIME"),
			"import.meta.env.MODE": getEnv("MODE"),
			"import.meta.env.AUTH_EMAIL_VERIFICATION_ENABLED": getEnv("AUTH_EMAIL_VERIFICATION_ENABLED"),
			"import.meta.env.AUTH_SOCIAL_GOOGLE_ENABLED": getEnv("AUTH_SOCIAL_GOOGLE_ENABLED"),
			"import.meta.env.AUTH_SOCIAL_GITHUB_ENABLED": getEnv("AUTH_SOCIAL_GITHUB_ENABLED"),
			"import.meta.env.GOOGLE_ANALYTICS_ID": getEnv("GOOGLE_ANALYTICS_ID"),
			"import.meta.env.PROVIDER_CLOUDFLARE_BUILTIN": getEnv("PROVIDER_CLOUDFLARE_BUILTIN"),
		},
		build: {
			outDir: path.resolve(__dirname, "dist-web"),
			emptyOutDir: true,
		},
		server: {
			port: 5175,
		},
	};
});
