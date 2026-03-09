import { adminService, AdminLoginSchema, CreateAdminSchema } from "@/admin/service";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type Env, ok } from "@/admin/api/util";
import aiRouter from "./ai";
import creationRouter from "./creation";

const UpdateAdminSchema = z.object({
	name: z.string().min(1).optional(),
	department: z.string().optional(),
});

// 头像上传 Schema
const UploadAvatarSchema = z.object({
	image: z.string().min(1, "图片数据不能为空"),
});

const app = new Hono<Env>()
	.basePath("/admin")
	.post("/login", zValidator("json", AdminLoginSchema), async (c) => {
		const req = c.req.valid("json");
		// 获取真实 IP：x-forwarded-for 可能包含多个 IP，取第一个
		const forwardedFor = c.req.header("x-forwarded-for");
		const ip = forwardedFor
			? forwardedFor.split(",")[0]?.trim()
			: c.req.header("x-real-ip") || c.req.header("cf-connecting-ip");
		const userAgent = c.req.header("user-agent");

		const result = await adminService.login(req, { ip, userAgent });

		if (!result.success) {
			return c.json({
				code: "error",
				errorCode: result.errorCode,
				message: result.error,
			}, 400);
		}

		return c.json(ok({
			token: result.token,
			admin: result.admin,
		}));
	})
	.post("/create", zValidator("json", CreateAdminSchema), async (c) => {
		const req = c.req.valid("json");

		const result = await adminService.createAdmin(req);

		if (!result.success) {
			return c.json({
				code: "error",
				errorCode: result.errorCode,
				message: result.error,
			}, 400);
		}

		return c.json(ok({
			adminId: result.adminId,
		}));
	})
	.get("/verify", async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		const result = await adminService.verifyToken(token);

		if (!result.success) {
			return c.json({
				code: "error",
				message: "Invalid or expired token",
			}, 401);
		}

		return c.json(ok({
			admin: result.admin,
		}));
	})
	.post("/logout", async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		await adminService.logout(token);

		return c.json(ok());
	})
	.put("/profile", zValidator("json", UpdateAdminSchema), async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		const verifyResult = await adminService.verifyToken(token);

		if (!verifyResult.success || !verifyResult.admin) {
			return c.json({
				code: "error",
				message: "Invalid or expired token",
			}, 401);
		}

		const data = c.req.valid("json");
		const result = await adminService.updateAdmin(verifyResult.admin.id, data);

		if (!result.success) {
			return c.json({
				code: "error",
				message: result.error,
			}, 400);
		}

		return c.json(ok());
	})
	.post("/avatar", zValidator("json", UploadAvatarSchema), async (c) => {
		const authHeader = c.req.header("Authorization");
		
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({
				code: "error",
				message: "No token provided",
			}, 401);
		}

		const token = authHeader.substring(7);
		const verifyResult = await adminService.verifyToken(token);

		if (!verifyResult.success || !verifyResult.admin) {
			return c.json({
				code: "error",
				message: "Invalid or expired token",
			}, 401);
		}

		const { image } = c.req.valid("json");

		// 上传头像文件，获取路径
		const uploadResult = await adminService.uploadAvatar(verifyResult.admin.id, image);

		if (!uploadResult.success) {
			return c.json({
				code: "error",
				message: uploadResult.error,
			}, 400);
		}

		// 更新数据库中的头像路径
		const updateResult = await adminService.updateAdmin(verifyResult.admin.id, { image: uploadResult.imagePath });

		if (!updateResult.success) {
			return c.json({
				code: "error",
				message: updateResult.error,
			}, 400);
		}

		return c.json(ok({ image: uploadResult.imagePath }));
	})
	.route("/", aiRouter)
	.route("/", creationRouter);

export default app;
