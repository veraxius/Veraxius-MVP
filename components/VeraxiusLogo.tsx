"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const ICON_SRC = "/veraxius-icon.png";

type VeraxiusLogoProps = {
	variant?: "navbar" | "login";
	className?: string;
	priority?: boolean;
};

const variantConfig = {
	navbar: {
		icon: "h-6 w-auto sm:h-7",
		text: "text-lg sm:text-xl",
		gap: "gap-1.5 sm:gap-2",
	},
	login: {
		icon: "h-9 w-auto sm:h-11",
		text: "text-2xl sm:text-3xl",
		gap: "gap-2 sm:gap-2.5",
	},
} as const;

export function VeraxiusLogo({
	variant = "navbar",
	className,
	priority = false,
}: VeraxiusLogoProps) {
	const config = variantConfig[variant];

	return (
		<span className={cn("inline-flex items-center", config.gap, className)}>
			<Image
				src={ICON_SRC}
				alt=""
				width={200}
				height={220}
				priority={priority}
				className={cn(config.icon, "w-auto shrink-0")}
			/>
			<span
				className={cn(
					"font-extrabold uppercase tracking-tight leading-none",
					config.text,
				)}
				style={{ color: "var(--text-primary)", fontFamily: "var(--font-apple)" }}
			>
				Veraxius
			</span>
		</span>
	);
}
