import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { aiService } from "@/admin/service/ai";
import { z } from "zod";

// Provider schemas
const CreateProviderSchema = z.object({
	providerId: z.string().min(1, "Provider ID is required"),
	name: z.string().min(1, "Name is required"),
	icon: z.string().optional(),
	endpoints: z.string().optional(),
	secretKey: z.string().optional(),
	enabled: z.boolean().default(true),
	settings: z.string().optional(),
});

const UpdateProviderSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	icon: z.string().optional(),
	endpoints: z.string().optional(),
	secretKey: z.string().optional(),
	enabled: z.boolean().optional(),
	settings: z.string().optional(),
});

// Model schemas
const CreateModelSchema = z.object({
	providerId: z.string().min(1, "Provider ID is required"),
	modelId: z.string().min(1, "Model ID is required"),
	name: z.string().optional(),
	type: z.enum(["text2image", "text2video"]),
	description: z.string().optional(),
	settings: z.string().optional(),
	enabled: z.boolean().default(true),
});

const UpdateModelSchema = z.object({
	modelId: z.string().min(1, "Model ID is required").optional(),
	name: z.string().optional(),
	type: z.enum(["text2image", "text2video"]).optional(),
	description: z.string().optional(),
	settings: z.string().optional(),
	enabled: z.boolean().optional(),
});

const app = new Hono<Env>()
	.basePath("/ai")
	// Provider routes
	.get("/providers", async (c) => {
		const result = await aiService.getProviders();
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.providers));
	})
	.get("/providers/:id", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.getProviderById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.provider));
	})
	.post("/providers", zValidator("json", CreateProviderSchema), async (c) => {
		const data = c.req.valid("json");
		const result = await aiService.createProvider(data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ id: result.id }), 201);
	})
	.put("/providers/:id", zValidator("json", UpdateProviderSchema), async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const result = await aiService.updateProvider(id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ id: result.id }));
	})
	.delete("/providers/:id", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.deleteProvider(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Model routes
	.get("/models", async (c) => {
		const providerId = c.req.query("providerId");
		const result = await aiService.getModels(providerId);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.models));
	})
	.get("/models/:id", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.getModelById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.model));
	})
	.post("/models", zValidator("json", CreateModelSchema), async (c) => {
		const data = c.req.valid("json");
		const result = await aiService.createModel(data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ id: result.id }), 201);
	})
	.put("/models/:id", zValidator("json", UpdateModelSchema), async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const result = await aiService.updateModel(id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ id: result.id }));
	})
	.delete("/models/:id", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.deleteModel(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Toggle provider enabled status
	.patch("/providers/:id/toggle", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.toggleProviderEnabled(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ enabled: result.enabled }));
	})
	// Update provider sort order
	.patch("/providers/:id/sort", zValidator("json", z.object({ sort: z.number() })), async (c) => {
		const id = c.req.param("id");
		const { sort } = c.req.valid("json");
		const result = await aiService.updateProviderSort(id, sort);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Toggle model enabled status
	.patch("/models/:id/toggle", async (c) => {
		const id = c.req.param("id");
		const result = await aiService.toggleModelEnabled(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ enabled: result.enabled }));
	});

export default app;
