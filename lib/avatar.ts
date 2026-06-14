export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

export function getUserInitial(name?: string | null, email?: string | null): string {
	const source = (name?.trim() || email?.trim() || "?").charAt(0);
	return source.toUpperCase();
}

export function validateAvatarFile(file: File): string | null {
	if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
		return "Please choose a JPEG, PNG, or WebP image.";
	}
	if (file.size > AVATAR_MAX_SIZE) {
		return "Image must be 5MB or smaller.";
	}
	return null;
}
