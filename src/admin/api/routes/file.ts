import fs from "node:fs/promises";
import { getFileMetadata } from "@/admin/service/storage";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { type Env } from "../util";
const serveFile = async (c: any, fileId: string, logPrefix: string) => {
	try {
		const metadata = await getFileMetadata(fileId);
		if (!metadata) {
			console.log(`[${logPrefix}] File not found: ${fileId}`);
			return c.json({ error: "File not found" }, 404);
		}

		// Determine content type based on protocol
		let contentType = "image/png";
		if (metadata.protocol === "data") {
			const base64Header = metadata.accessUrl.split(",")[0];
			contentType = base64Header?.split(";")[0]?.split(":")[1] || "image/png";
		} else if (metadata.protocol === "file") {
			const suffix = metadata.accessUrl.split(".").pop();
			contentType = `image/${suffix}`;
			
		}	
		const etag = btoa(`"${fileId}"`);
		c.header("ETag", etag);
		c.header("Content-Type", contentType);
		c.header("Content-Protocol", metadata.protocol);
		c.header("Cache-Control", "private, max-age=31536000");

		if (c.req.header("If-None-Match") === etag) {
			return c.body(null, 304);
		}

		switch (metadata.protocol) {
			case "data": {
				const [base64Header, base64Data] = metadata.accessUrl.split(",");
				if (!base64Header || !base64Data) {
					return c.json({ error: "Invalid file data" }, 500);
				}
				return stream(c, async (stream) => {
					const buffer = Buffer.from(base64Data, "base64");
					await stream.write(buffer);
				});
			}
			case "file": {
				console.log(`[File Preview] Reading file from: ${metadata.accessUrl}`);
				try {
					const fileBuffer = await fs.readFile(metadata.accessUrl);
					console.log(`[File Preview] File read successfully, size: ${fileBuffer.length} bytes`);
					return stream(c, async (stream) => {
						await stream.write(fileBuffer);
					});
				} catch (error) {
					console.error(`[File Preview] Error reading file: ${error}`);
					return c.json({ error: "Failed to read file" }, 500);
				}
			}
			default:
				return c.redirect(metadata.accessUrl);
		}
	} catch (error) {
		console.error(`[${logPrefix}] Error:`, error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
};

const app = new Hono<Env>()
	.basePath("/files")
	.get("/preview/:id", async (c) => serveFile(c, c.req.param("id"), "Admin File Preview"))
	.get("/:id", async (c) => serveFile(c, c.req.param("id"), "Admin File Direct"));

export default app;
