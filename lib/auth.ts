export type AuthUser = { id: string; email: string; name?: string; created_at?: string };

const TOKEN_KEY = "vx_token";
const USER_KEY = "vx_user";

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
	return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function saveAuth(token: string, user: AuthUser) {
	if (!isBrowser()) return;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuth():
	| { token: string; user: AuthUser }
	| null {
	if (!isBrowser()) return null;
	const token = localStorage.getItem(TOKEN_KEY);
	const rawUser = localStorage.getItem(USER_KEY);
	if (!token || !rawUser) return null;
	try {
		return { token, user: JSON.parse(rawUser) as AuthUser };
	} catch {
		return null;
	}
}

export function clearAuth() {
	if (!isBrowser()) return;
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
}
