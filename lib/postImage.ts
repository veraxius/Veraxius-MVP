export const POST_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const POST_IMAGE_MAX_SIZE = 8 * 1024 * 1024;

export function validatePostImageFile(file: File): string | null {
	if (!POST_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof POST_IMAGE_ALLOWED_TYPES)[number])) {
		return "Please choose a JPEG, PNG, or WebP image.";
	}
	if (file.size > POST_IMAGE_MAX_SIZE) {
		return "Image must be 8MB or smaller.";
	}
	return null;
}
