export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "vx-theme";

/** Local time fallback for when the browser exposes no color-scheme preference. */
function getTimeOfDayTheme(): Theme {
	const hour = new Date().getHours();
	return hour < 7 || hour >= 19 ? "dark" : "light";
}

/** Follows the OS/browser color-scheme setting; falls back to time of day. */
export function getSystemTheme(): Theme {
	if (typeof window === "undefined") return "light";
	if (window.matchMedia) {
		if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
		if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
	}
	return getTimeOfDayTheme();
}

/** True once the user has manually chosen a theme (their choice always wins after that). */
export function hasStoredTheme(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return stored === "dark" || stored === "light";
	} catch {
		return false;
	}
}

export function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "light";
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored === "dark" || stored === "light") return stored;
	} catch {
		// ignore
	}
	return getSystemTheme();
}

export function setStoredTheme(theme: Theme) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// ignore
	}
}

export function applyTheme(theme: Theme) {
	if (typeof document === "undefined") return;
	if (theme === "dark") {
		document.documentElement.setAttribute("data-theme", "dark");
	} else {
		document.documentElement.removeAttribute("data-theme");
	}
}
