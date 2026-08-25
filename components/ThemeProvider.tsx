"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
	applyTheme,
	getStoredTheme,
	getSystemTheme,
	hasStoredTheme,
	setStoredTheme,
	type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
	theme: Theme;
	toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>("light");
	const hasManualChoice = useRef(false);

	useEffect(() => {
		const stored = getStoredTheme();
		setTheme(stored);
		applyTheme(stored);
		hasManualChoice.current = hasStoredTheme();
	}, []);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Keep following the OS/browser color-scheme (and time of day) live,
	// unless the person has explicitly picked a theme with the toggle.
	useEffect(() => {
		function syncFromSystem() {
			if (hasManualChoice.current) return;
			setTheme(getSystemTheme());
		}
		let mediaQuery: MediaQueryList | undefined;
		if (typeof window !== "undefined" && window.matchMedia) {
			mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			mediaQuery.addEventListener("change", syncFromSystem);
		}
		const interval = setInterval(syncFromSystem, 15 * 60 * 1000);
		return () => {
			mediaQuery?.removeEventListener("change", syncFromSystem);
			clearInterval(interval);
		};
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme((current) => {
			const next = current === "dark" ? "light" : "dark";
			hasManualChoice.current = true;
			setStoredTheme(next);
			return next;
		});
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return ctx;
}
