import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type Env, authMiddleware, error, ok } from "../util";
import {
	creationService,
	CreateCreationSchema,
	GetCreationByIdSchema,
	UpdateCreationSchema,
	DeleteCreationSchema,
} from "@/server/service/creation";

const app = new Hono<Env>()
	.basePath("/creations")
	.use(authMiddleware)
	.get("/", async (c) => {
		const user = c.var.user!;
		const creations = await creationService.getCreations({ userId: user.id });
		return c.json(ok(creations));
	})
	.get("/:id", async (c) => {
		const user = c.var.user!;
		const id = c.req.param("id");
		const creation = await creationService.getCreationById({ id }, { userId: user.id });
		if (!creation) {
			return c.json(error("not_found", "Creation not found"), 404);
		}
		return c.json(ok(creation));
	})
	.post("/", zValidator("json", CreateCreationSchema), async (c) => {
		const user = c.var.user!;
		const data = c.req.valid("json");
		const result = await creationService.createCreation(data, { userId: user.id });
		return c.json(ok(result), 201);
	})
	.put("/:id", zValidator("json", UpdateCreationSchema), async (c) => {
		const user = c.var.user!;
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const success = await creationService.updateCreation(id, data, { userId: user.id });
		if (!success) {
			return c.json(error("not_found", "Creation not found"), 404);
		}
		return c.json(ok({ success: true }));
	})
	.delete("/:id", async (c) => {
		const user = c.var.user!;
		const id = c.req.param("id");
		const success = await creationService.deleteCreation({ id }, { userId: user.id });
		if (!success) {
			return c.json(error("not_found", "Creation not found"), 404);
		}
		return c.json(ok({ success: true }));
	});

export default app;
