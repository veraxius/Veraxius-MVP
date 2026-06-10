"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

type ThemeContextValue = {
	theme: Theme;
	toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>("dark");

	useEffect(() => {
		const stored = getStoredTheme();
		setTheme(stored);
		applyTheme(stored);
	}, []);

	useEffect(() => {
		applyTheme(theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			// ignore
		}
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((current) => (current === "dark" ? "light" : "dark"));
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
