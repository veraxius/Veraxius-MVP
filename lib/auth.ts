export type AuthUser = { id: string; email: string; name?: string; created_at?: string };

const TOKEN_KEY = "vx_token";
const USER_KEY = "vx_user";

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
	return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

const SESSION_FLAG = "vx_session=1";

/** Mirrors session for optional Edge middleware / SSR checks (JWT remains in localStorage). */
function setSessionCookie(flag: boolean) {
	if (!isBrowser()) return;
	if (flag) {
		const maxAge = 60 * 60 * 24 * 30;
		document.cookie = `${SESSION_FLAG}; path=/; max-age=${maxAge}; SameSite=Lax`;
	} else {
		document.cookie = "vx_session=; path=/; max-age=0";
	}
}

/** Call on app load so `vx_session` exists for users who logged in before the cookie flag shipped. */
export function syncSessionCookieFromStorage() {
	if (!isBrowser() || !getToken()) return;
	if (document.cookie.includes("vx_session=1")) return;
	setSessionCookie(true);
}

export function saveAuth(token: string, user: AuthUser) {
	if (!isBrowser()) return;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, JSON.stringify(user));
	setSessionCookie(true);
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
	setSessionCookie(false);
}
