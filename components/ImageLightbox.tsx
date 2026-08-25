"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
	src: string;
	onClose: () => void;
};

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose]);

	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8"
			style={{ backgroundColor: "var(--overlay-scrim)" }}
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 sm:right-6 sm:top-6"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden
				>
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>

			<img
				src={src}
				alt=""
				className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			/>
		</div>,
		document.body,
	);
}
