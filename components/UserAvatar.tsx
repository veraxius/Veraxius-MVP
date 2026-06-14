"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { getUserInitial, validateAvatarFile } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
	userId: string;
	name?: string | null;
	email?: string | null;
	profilePictureUrl?: string | null;
	size?: "sm" | "md" | "lg";
	editable?: boolean;
	onUploaded?: (url: string) => void;
	className?: string;
};

const sizeClasses = {
	sm: {
		avatar: "w-8 h-8 text-xs",
		camera: "h-5 w-5 -bottom-0.5 -right-0.5",
		cameraIcon: 10,
	},
	md: {
		avatar: "w-10 h-10 text-sm",
		camera: "h-6 w-6 bottom-0 right-0",
		cameraIcon: 12,
	},
	lg: {
		avatar: "w-24 h-24 text-2xl",
		camera: "h-8 w-8 bottom-0 right-0",
		cameraIcon: 14,
	},
} as const;

export function UserAvatar({
	userId,
	name,
	email,
	profilePictureUrl = null,
	size = "lg",
	editable = false,
	onUploaded,
	className,
}: UserAvatarProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [displayUrl, setDisplayUrl] = useState<string | null>(profilePictureUrl);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const previousUrlRef = useRef<string | null>(profilePictureUrl);

	useEffect(() => {
		setDisplayUrl(profilePictureUrl);
		previousUrlRef.current = profilePictureUrl;
	}, [profilePictureUrl]);

	const initial = getUserInitial(name, email);
	const sizes = sizeClasses[size];

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		const validationError = validateAvatarFile(file);
		if (validationError) {
			setUploadError(validationError);
			return;
		}

		setUploadError(null);
		const previewUrl = URL.createObjectURL(file);
		const savedUrl = displayUrl;
		setDisplayUrl(previewUrl);
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append("avatar", file);

			const resp = await apiFetch(`${API_URL}/api/users/${userId}/avatar`, {
				method: "POST",
				body: formData,
			});
			const data = await resp.json();
			if (!resp.ok) {
				throw new Error(data?.error || "Upload failed");
			}

			const url = String(data.profilePictureUrl);
			setDisplayUrl(url);
			previousUrlRef.current = url;
			onUploaded?.(url);
			window.dispatchEvent(
				new CustomEvent("vx-avatar-updated", { detail: { profilePictureUrl: url } }),
			);
		} catch (err: unknown) {
			setDisplayUrl(savedUrl);
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			URL.revokeObjectURL(previewUrl);
			setUploading(false);
		}
	}

	return (
		<div className={cn(size === "lg" && "flex flex-col items-center gap-2", className)}>
			<div className="relative shrink-0">
				<div
					className={cn(
						sizes.avatar,
						"rounded-full overflow-hidden border border-[var(--divider)] flex items-center justify-center font-semibold",
						displayUrl ? "bg-[var(--bg-panel)]" : "bg-[var(--amber)] text-[var(--text-on-amber)]",
						uploading && "opacity-80",
					)}
				>
					{displayUrl ? (
						<img
							src={displayUrl}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : (
						<span aria-hidden>{initial}</span>
					)}
				</div>

				{editable && (
					<>
						<input
							ref={fileInputRef}
							type="file"
							accept={["image/jpeg", "image/png", "image/webp"].join(",")}
							className="sr-only"
							onChange={handleFileChange}
							disabled={uploading}
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
							className={cn(
								"absolute inline-flex items-center justify-center rounded-full",
								"border border-[var(--divider)] bg-[var(--bg-panel)] text-[var(--text-primary)]",
								"hover-bg-surface transition-colors shadow-sm",
								sizes.camera,
							)}
							aria-label="Change profile picture"
							title="Change profile picture"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={sizes.cameraIcon}
								height={sizes.cameraIcon}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden
							>
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
								<circle cx="12" cy="13" r="4" />
							</svg>
						</button>
					</>
				)}
			</div>

			{uploadError && size === "lg" ? (
				<p className="text-xs text-[var(--red)] text-center max-w-[12rem]">{uploadError}</p>
			) : null}
		</div>
	);
}
