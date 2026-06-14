"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

function MoonIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	);
}

function SunIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
		</svg>
	);
}

export function ThemeToggle({
	className,
	variant = "icon",
}: {
	className?: string;
	variant?: "icon" | "menu";
}) {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === "dark";

	if (variant === "menu") {
		return (
			<button
				type="button"
				onClick={toggleTheme}
				className={cn(
					"flex w-full items-center gap-3 rounded-lg px-3 min-h-11 text-sm font-medium text-left",
					"text-[var(--text-primary)] hover-bg-surface transition-colors",
					className,
				)}
				aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			>
				<span className="inline-flex shrink-0 text-[var(--text-secondary)]">
					{isDark ? <MoonIcon /> : <SunIcon />}
				</span>
				<span>Appearance</span>
				<span className="ml-auto text-xs text-[var(--text-tertiary)]">
					{isDark ? "Dark" : "Light"}
				</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={toggleTheme}
			className={cn(
				"inline-flex items-center justify-center rounded-full px-4 min-h-11 text-sm font-semibold",
				"border border-[var(--divider)] text-[var(--text-secondary)] hover-bg-surface transition-colors",
				className,
			)}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			title={isDark ? "Light mode" : "Dark mode"}
		>
			{isDark ? <MoonIcon /> : <SunIcon />}
		</button>
	);
}
