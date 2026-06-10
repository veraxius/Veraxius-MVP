export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "vx-theme";

export function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	try {
		return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
	} catch {
		return "dark";
	}
}

export function applyTheme(theme: Theme) {
	if (typeof document === "undefined") return;
	if (theme === "light") {
		document.documentElement.setAttribute("data-theme", "light");
	} else {
		document.documentElement.removeAttribute("data-theme");
	}
}
