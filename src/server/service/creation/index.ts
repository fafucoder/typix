import { creations } from "@/server/db/schemas/creation";
import { ServiceException } from "@/server/lib/exception";
import { and, desc, eq } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod/v4";
import { type RequestContext, getContext } from "../context";

// Schemas
export const CreateCreationSchema = createInsertSchema(creations)
	.pick({
		title: true,
		provider: true,
		model: true,
		type: true,
		prompt: true,
		aspectRatio: true,
		imageCount: true,
	})
	.extend({
		prompt: z.string().min(1, "Prompt is required"),
		provider: z.string().min(1, "Provider is required"),
		model: z.string().min(1, "Model is required"),
	});
export type CreateCreation = z.infer<typeof CreateCreationSchema>;

export const GetCreationByIdSchema = z.object({
	id: z.string(),
});
export type GetCreationById = z.infer<typeof GetCreationByIdSchema>;

export const UpdateCreationSchema = createUpdateSchema(creations)
	.pick({
		title: true,
		status: true,
		resultUrls: true,
		errorMessage: true,
	});
export type UpdateCreation = z.infer<typeof UpdateCreationSchema>;

export const DeleteCreationSchema = z.object({
	id: z.string(),
});
export type DeleteCreation = z.infer<typeof DeleteCreationSchema>;

// Service functions
const getCreations = async (ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const userCreations = await db
		.select()
		.from(creations)
		.where(and(eq(creations.userId, userId), eq(creations.deleted, 0)))
		.orderBy(desc(creations.createdAt));

	return userCreations;
};

const getCreationById = async (req: GetCreationById, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const [creation] = await db
		.select()
		.from(creations)
		.where(and(
			eq(creations.id, req.id),
			eq(creations.userId, userId),
			eq(creations.deleted, 0)
		))
		.limit(1);

	return creation || null;
};

const createCreation = async (req: CreateCreation, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const [creation] = await db
		.insert(creations)
		.values({
			userId,
			title: req.title,
			provider: req.provider,
			model: req.model,
			type: req.type,
			prompt: req.prompt,
			aspectRatio: req.aspectRatio,
			imageCount: req.imageCount || 1,
			status: "pending",
		})
		.returning();

	return { id: creation!.id };
};

const updateCreation = async (id: string, req: UpdateCreation, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const [existing] = await db
		.select()
		.from(creations)
		.where(and(eq(creations.id, id), eq(creations.userId, userId)))
		.limit(1);

	if (!existing) {
		return false;
	}

	await db
		.update(creations)
		.set({
			...(req.title !== undefined && { title: req.title }),
			...(req.status !== undefined && { status: req.status }),
			...(req.resultUrls !== undefined && { resultUrls: req.resultUrls }),
			...(req.errorMessage !== undefined && { errorMessage: req.errorMessage }),
			updatedAt: new Date(),
		})
		.where(eq(creations.id, id));

	return true;
};

const deleteCreation = async (req: DeleteCreation, ctx: RequestContext) => {
	const { db } = getContext();
	const { userId } = ctx;

	const [existing] = await db
		.select()
		.from(creations)
		.where(and(eq(creations.id, req.id), eq(creations.userId, userId)))
		.limit(1);

	if (!existing) {
		return false;
	}

	await db
		.update(creations)
		.set({ deleted: 1, updatedAt: new Date() })
		.where(eq(creations.id, req.id));

	return true;
};

export const creationService = {
	getCreations,
	getCreationById,
	createCreation,
	updateCreation,
	deleteCreation,
};
