import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { userService } from "@/admin/service/user";

const app = new Hono<Env>()
	.basePath("/users")
	// Get user list
	.get("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const page = Number(c.req.query("page")) || 1;
		const pageSize = Number(c.req.query("pageSize")) || 20;
		const search = c.req.query("search");

		const result = await userService.getUsers({ page, pageSize, search });
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	// Get user by ID
	.get("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await userService.getUserById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok(result.user));
	})
	// Delete user
	.delete("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await userService.deleteUser(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	})
	// Delete multiple users
	.post("/delete-batch", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const { ids } = await c.req.json<{ ids: string[] }>();
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return c.json({ code: "error", message: "Invalid user IDs" }, 400);
		}

		const result = await userService.deleteUsers(ids);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
