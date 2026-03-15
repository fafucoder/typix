import { Hono } from "hono";
import { type Env, ok } from "@/admin/api/util";
import { chatService } from "@/admin/service/chat";

const app = new Hono<Env>()
	.basePath("/chats")
	.get("/", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const page = Number(c.req.query("page")) || 1;
		const pageSize = Number(c.req.query("pageSize")) || 20;
		const search = c.req.query("search");
		const userName = c.req.query("userName");

		const result = await chatService.getChats({ page, pageSize, search, userName });
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 500);
		}
		return c.json(ok(result.data));
	})
	.get("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await chatService.getChatById(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 404);
		}
		return c.json(ok({ chat: result.chat, messages: result.messages }));
	})
	.delete("/:id", async (c) => {
		const currentUser = c.get("user");
		if (!currentUser) {
			return c.json({ code: "error", message: "Unauthorized" }, 401);
		}

		const id = c.req.param("id");
		const result = await chatService.deleteChat(id);
		if (!result.success) {
			return c.json({ code: "error", message: result.error }, 400);
		}
		return c.json(ok({ success: true }));
	});

export default app;
