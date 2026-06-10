"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const LOGO_DARK = "/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png";
const LOGO_LIGHT_NAVBAR = "/logonuevo.png";
const LOGO_LIGHT_LOGIN = "/logonuevo.png";

type VeraxiusLogoProps = {
	variant?: "navbar" | "login";
	className?: string;
	priority?: boolean;
};

const variantConfig = {
	navbar: {
		dark: {
			width: 140,
			height: 28,
			className: "h-6 w-auto sm:h-7 max-w-[120px] sm:max-w-[140px]",
		},
		light: {
			width: 214,
			height: 48,
			className:
				"h-[46px] w-auto sm:h-[50px] max-w-[194px] sm:max-w-[230px] origin-left -translate-x-[3px] sm:-translate-x-0.5 -translate-y-0.5",
		},
	},
	login: {
		dark: {
			width: 220,
			height: 44,
			className: "h-8 w-auto sm:h-10 md:h-11 max-w-[min(100%,220px)]",
		},
		light: {
			width: 320,
			height: 64,
			className: "h-[52px] w-auto sm:h-16 md:h-[5rem] max-w-[min(100%,320px)] translate-y-0",
		},
	},
} as const;

export function VeraxiusLogo({
	variant = "navbar",
	className,
	priority = false,
}: VeraxiusLogoProps) {
	const { theme } = useTheme();
	const mode = theme === "light" ? "light" : "dark";
	const config = variantConfig[variant][mode];
	const src =
		theme === "light"
			? variant === "navbar"
				? LOGO_LIGHT_NAVBAR
				: LOGO_LIGHT_LOGIN
			: LOGO_DARK;

	return (
		<Image
			src={src}
			alt="Veraxius"
			width={config.width}
			height={config.height}
			priority={priority}
			className={cn(config.className, className)}
		/>
	);
}
