import { type Storage, files } from "@/admin/db/schemas/file";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid/non-secure";
import { getContext } from "./context";

// Generate unique ID for files
const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 16);

// File Metadata Interface
export interface FileMetadata {
	file: typeof files.$inferSelect;
	protocol: string;
	accessUrl: string;
}

// File Storage Interface - All storage types must implement this
export interface FileStorageProvider {
	/**
	 * Storage type identifier
	 */
	readonly type: Storage;

	/**
	 * Save a file to storage
	 * @param fileData Base64 encoded file data
	 * @param userId User ID who owns the file
	 * @returns Promise resolving to stored file reference (URL, path, or identifier)
	 */
	save(fileData: string, userId: string): Promise<string>;

	/**
	 * Get a file URL or path from storage
	 * @param file File record from database
	 * @param userId User ID to check access
	 * @returns Promise resolving to URL or path to the file, or null if not found
	 */
	get(file: typeof files.$inferSelect, userId: string): Promise<string | null>;

	/**
	 * Get file data as base64 data URL
	 * @param file File record from database
	 * @param userId User ID to check access
	 * @returns Promise resolving to base64 data URL, or null if not found
	 */
	getData?(file: typeof files.$inferSelect, userId: string): Promise<string | null>;
}

// Base64 Storage Provider - Stores data directly in database
class Base64StorageProvider implements FileStorageProvider {
	readonly type = "base64" as const;

	async save(fileData: string, userId: string): Promise<string> {
		// Store base64 data directly
		return fileData;
	}

	async get(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		return file.url;
	}

	async getData(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		return file.url;
	}
}

// Local Disk Storage Provider - Stores files on local filesystem
class DiskStorageProvider implements FileStorageProvider {
	readonly type = "disk" as const;
	private basePath: string;
	private fs: typeof import("node:fs") | null = null;
	private path: typeof import("node:path") | null = null;
	private initialized = false;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	private async initialize(): Promise<void> {
		if (this.initialized) return;

		this.fs = await import("node:fs");
		this.path = await import("node:path");
		this.initialized = true;

		// Ensure that storage directory exists
		if (!this.fs.existsSync(this.basePath)) {
			this.fs.mkdirSync(this.basePath, { recursive: true });
		}
	}

	async save(fileData: string, userId: string): Promise<string> {
		await this.initialize();
		if (!this.fs || !this.path) {
			throw new Error("Node.js filesystem modules not available");
		}

		// Extract file extension from base64 data URL
		const match = fileData.match(/^data:image\/(\w+);base64,/);
		const extension = match ? match[1] : "png";

		// Generate unique filename
		const filename = `${generateId()}.${extension}`;
		const filePath = this.path.join(this.basePath, filename);

		// Extract base64 data without prefix
		const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");

		// Write file to disk
		this.fs.writeFileSync(filePath, buffer);

		// Return relative path to the file
		return filename;
	}

	async get(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		await this.initialize();
		if (!this.path) {
			throw new Error("Node.js path module not available");
		}

		// Return full path to the file
		return this.path.join(this.basePath, file.url);
	}

	async getData(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		await this.initialize();
		if (!this.fs) {
			throw new Error("Node.js filesystem modules not available");
		}

		const fullPath = await this.get(file, userId);
		if (!fullPath) return null;

		try {
			const fileSuffix = file.url.split(".").pop();
			const data = await this.fs.promises.readFile(fullPath, "base64");
			return base64ToDataURI(data, fileSuffix);
		} catch {
			return null;
		}
	}
}

// S3 Storage Provider - Stores files in S3-compatible object storage
class S3StorageProvider implements FileStorageProvider {
	readonly type = "s3" as const;
	private config: {
		bucket: string;
		region: string;
		accessKeyId: string;
		secretAccessKey: string;
		endpoint?: string;
	};
	private s3Client: any = null;
	private initialized = false;
	private sdkAvailable = false;
	private S3Client: any = null;
	private PutObjectCommand: any = null;
	private GetObjectCommand: any = null;
	private getSignedUrl: any = null;

	constructor(config: {
		bucket: string;
		region: string;
		accessKeyId: string;
		secretAccessKey: string;
		endpoint?: string;
	}) {
		this.config = config;
	}

	private async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			// Dynamically import AWS SDK only when needed
			const s3Module = await import("@aws-sdk/client-s3");
			const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

			this.S3Client = s3Module.S3Client;
			this.PutObjectCommand = s3Module.PutObjectCommand;
			this.GetObjectCommand = s3Module.GetObjectCommand;
			this.getSignedUrl = getSignedUrl;

			this.s3Client = new this.S3Client({
				region: this.config.region,
				credentials: {
					accessKeyId: this.config.accessKeyId,
					secretAccessKey: this.config.secretAccessKey,
				},
				...(this.config.endpoint && { endpoint: this.config.endpoint }),
			});

			this.sdkAvailable = true;
			this.initialized = true;
		} catch (error) {
			console.warn("AWS SDK not available, S3 storage will be disabled:", error);
			this.sdkAvailable = false;
			this.initialized = true;
		}
	}

	async save(fileData: string, userId: string): Promise<string> {
		await this.initialize();
		if (!this.sdkAvailable || !this.s3Client) {
			throw new Error("S3 storage is not available. Please install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner");
		}

		// Extract file extension from base64 data URL
		const match = fileData.match(/^data:image\/(\w+);base64,/);
		const extension = match ? match[1] : "png";
		const contentType = match ? `image/${match[1]}` : "image/png";

		// Generate unique filename
		const filename = `${generateId()}.${extension}`;
		const key = `uploads/${userId}/${filename}`;

		// Extract base64 data without prefix
		const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");

		// Upload to S3
		await this.s3Client.send(
			new this.PutObjectCommand({
				Bucket: this.config.bucket,
				Key: key,
				Body: buffer,
				ContentType: contentType,
			}),
		);

		// Return S3 key
		return key;
	}

	async get(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		await this.initialize();
		if (!this.sdkAvailable || !this.s3Client) {
			throw new Error("S3 storage is not available. Please install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner");
		}

		// Generate a presigned URL for temporary access
		try {
			const command = new this.GetObjectCommand({
				Bucket: this.config.bucket,
				Key: file.url,
			});
			return await this.getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
		} catch {
			return null;
		}
	}

	async getData(file: typeof files.$inferSelect, userId: string): Promise<string | null> {
		await this.initialize();
		if (!this.sdkAvailable || !this.s3Client) {
			throw new Error("S3 storage is not available. Please install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner");
		}

		try {
			const command = new this.GetObjectCommand({
				Bucket: this.config.bucket,
				Key: file.url,
			});
			const response = await this.s3Client.send(command);
			const bytes = await response.Body.transformToByteArray();
			const base64 = Buffer.from(bytes).toString("base64");
			const fileSuffix = file.url.split(".").pop();
			return base64ToDataURI(base64, fileSuffix);
		} catch {
			return null;
		}
	}
}

// Storage Provider Factory
class StorageProviderFactory {
	private providers: Map<Storage, FileStorageProvider> = new Map();
	private defaultProvider: FileStorageProvider;

	constructor() {
		// Initialize default base64 provider
		this.defaultProvider = new Base64StorageProvider();
		this.providers.set("base64", this.defaultProvider);

		// Initialize disk provider if configured
		const diskPath = process.env.FILE_STORAGE_DISK_PATH
			? (process.env.FILE_STORAGE_DISK_PATH.startsWith("/")
				? process.env.FILE_STORAGE_DISK_PATH
				: `${process.cwd()}/${process.env.FILE_STORAGE_DISK_PATH}`)
			: `${process.cwd()}/.files`;
		this.providers.set("disk", new DiskStorageProvider(diskPath));

		// Initialize S3 provider if configured
		if (
			process.env.S3_BUCKET &&
			process.env.S3_REGION &&
			process.env.S3_ACCESS_KEY_ID &&
			process.env.S3_SECRET_ACCESS_KEY
		) {
			this.providers.set(
				"s3",
				new S3StorageProvider({
					bucket: process.env.S3_BUCKET,
					region: process.env.S3_REGION,
					accessKeyId: process.env.S3_ACCESS_KEY_ID,
					secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
					endpoint: process.env.S3_ENDPOINT,
				}),
			);
		}
	}

	getProvider(type: Storage): FileStorageProvider {
		const provider = this.providers.get(type);
		if (!provider) {
			// Fallback to base64 if provider not found
			return this.defaultProvider;
		}
		return provider;
	}

	getDefaultProvider(): FileStorageProvider {
		return this.defaultProvider;
	}
}

// Global storage factory instance
const storageFactory = new StorageProviderFactory();

// Get current storage type from environment
export const fileStorage: Storage = ((process.env.FILE_STORAGE as Storage) || "base64");

// Get current storage provider
export function getCurrentStorageProvider(): FileStorageProvider {
	return storageFactory.getProvider(fileStorage);
}

// Helper functions
function base64ToDataURI(base64: string, fileSuffix: string = "png"): string {
	return `data:image/${fileSuffix};base64,${base64}`;
}

// Get file record from database
const getFileRecord = async (fileId: string, userId?: string) => {
	const { db } = getContext();
	const conditions = userId ? and(eq(files.id, fileId), eq(files.userId, userId)) : eq(files.id, fileId);
	const result = await db.select().from(files).where(conditions).limit(1);
	return result[0] || null;
};

// Get file metadata
export async function getFileMetadata(fileId: string, userId?: string): Promise<FileMetadata | null> {
	const file = await getFileRecord(fileId, userId);
	if (!file) {
		return null;
	}

	const provider = storageFactory.getProvider(file.storage);
	const accessUrl = await provider.get(file, userId || "");
	if (!accessUrl) {
		return null;
	}

	// Determine protocol based on storage type
	let protocol: string;
	switch (file.storage) {
		case "disk":
			protocol = "file";
			break;
		case "s3":
			protocol = "https";
			break;
		default:
			// For base64 or other types, try to detect from URL
			try {
				const url = new URL(accessUrl);
				protocol = url.protocol.replace(":", "");
			} catch {
				protocol = "data";
			}
	}

	return {
		file,
		protocol,
		accessUrl,
	};
}

// Get file data as base64 data URL
export async function getFileData(fileId: string, userId?: string): Promise<string | null> {
	const metadata = await getFileMetadata(fileId, userId);
	if (!metadata) {
		return null;
	}

	// Try to use provider's getData method if available
	const provider = storageFactory.getProvider(metadata.file.storage);
	if (provider.getData) {
		return await provider.getData(metadata.file, userId || "");
	}

	// Fallback based on protocol
	switch (metadata.protocol) {
		case "data":
			return metadata.accessUrl;
		case "file": {
			const fs = await import("node:fs/promises");
			try {
				const fileSuffix = metadata.file.url.split(".").pop();
				const data = await fs.readFile(metadata.accessUrl, "base64");
				return base64ToDataURI(data, fileSuffix);
			} catch {
				return null;
			}
		}
		default:
			return await fetchUrlToDataURI(metadata.accessUrl);
	}
}

// Fetch URL to data URI
async function fetchUrlToDataURI(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const blob = await response.blob();
		const buffer = await blob.arrayBuffer();
		const base64 = Buffer.from(buffer).toString("base64");
		const contentType = blob.type || "application/octet-stream";
		return `data:${contentType};base64,${base64}`;
	} catch {
		return null;
	}
}

// Get file URL for preview
export const getFileUrl = async (fileId: string, userId: string): Promise<string | null> => {
	const metadata = await getFileMetadata(fileId, userId);
	if (!metadata) {
		return null;
	}

	// For base64 storage, return the data URL directly
	if (metadata.file.storage === "base64") {
		return metadata.accessUrl;
	}

	// For S3, return the presigned URL directly
	if (metadata.file.storage === "s3") {
		return metadata.accessUrl;
	}

	// For disk storage, use the preview endpoint
	return `/api/files/preview/${metadata.file.id}`;
};

// Export storage providers for external use
export { Base64StorageProvider, DiskStorageProvider, S3StorageProvider, storageFactory };