import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Get encryption key from environment variable or use a default (for development only)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "typix-default-encryption-key-32chars!";

// Ensure key is 32 bytes for AES-256
const getKey = () => {
	const key = scryptSync(ENCRYPTION_KEY, "salt", 32);
	return key;
};

/**
 * Encrypt a string using AES-256-GCM
 * @param text - The text to encrypt
 * @returns The encrypted text in format: iv:authTag:ciphertext
 */
export const encrypt = (text: string): string => {
	const key = getKey();
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	
	const authTag = cipher.getAuthTag();
	
	// Return iv:authTag:ciphertext
	return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

/**
 * Decrypt a string using AES-256-GCM
 * @param encryptedText - The encrypted text in format: iv:authTag:ciphertext
 * @returns The decrypted text
 */
export const decrypt = (encryptedText: string): string => {
	const key = getKey();
	const parts = encryptedText.split(":");
	
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted text format");
	}
	
	const iv = Buffer.from(parts[0], "hex");
	const authTag = Buffer.from(parts[1], "hex");
	const ciphertext = parts[2];
	
	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(authTag);
	
	let decrypted = decipher.update(ciphertext, "hex", "utf8");
	decrypted += decipher.final("utf8");
	
	return decrypted;
};

/**
 * Check if a string is encrypted (has the format iv:authTag:ciphertext)
 * @param text - The text to check
 * @returns True if the text appears to be encrypted
 */
export const isEncrypted = (text: string): boolean => {
	if (!text) return false;
	const parts = text.split(":");
	return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
};
