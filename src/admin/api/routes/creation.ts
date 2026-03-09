import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { creationService } from "@/admin/service/creation";
import { z } from "zod";

const CreateCreationSchema = z.object({
	title: z.string().min(1, "Title is required"),
	provider: z.string().min(1, "Provider is required"),
	model: z.string().min(1, "Model is required"),
	type: z.enum(["text2image", "text2video"]),
	prompt: z.string().min(1, "Prompt is required"),
	aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
	imageCount: z.number().min(1).max(4).optional(),
});

const UpdateCreationSchema = z.object({
	title: z.string().min(1).optional(),
	status: z.enum(["pending", "generating", "completed", "failed"]).optional(),
	resultUrls: z.string().optional(),
	errorMessage: z.string().optional(),
});

const app = new Hono<Env>()
	.basePath("/creations")
	// Get all creations for current user
	.get("/", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const result = await creationService.getCreations(user.id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.creations));
	})
	// Get creation by ID
	.get("/:id", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await creationService.getCreationById(id, user.id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.creation));
	})
	// Create new creation
	.post("/", zValidator("json", CreateCreationSchema), async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const data = c.req.valid("json");
		const result = await creationService.createCreation({
			...data,
			userId: user.id,
		});
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ id: result.id }), 201);
	})
	// Update creation
	.put("/:id", zValidator("json", UpdateCreationSchema), async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const data = c.req.valid("json");
		const result = await creationService.updateCreation(id, user.id, data);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Delete creation (soft delete)
	.delete("/:id", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await creationService.deleteCreation(id, user.id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
