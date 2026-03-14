import type { AspectRatio } from "./api";

export type Ability = "t2i" | "i2i" | "t2v";

export interface AiModel {
	id: string;
	name: string;
	ability: Ability; // Model image/video generation ability
	maxInputImages?: number; // Maximum number of input images for i2i models, default is 1
	videoDurations?: number[]; // Supported video durations in seconds for t2v models
	enabled?: boolean; // Whether this model is currently enabled
	supportedAspectRatios?: AspectRatio[]; // Supported aspect ratios for the model
}
