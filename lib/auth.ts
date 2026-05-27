export type AuthUser = { id: string; email: string; name?: string; created_at?: string };

const TOKEN_KEY = "vx_token";
const REFRESH_KEY = "vx_refresh";
const USER_KEY = "vx_user";

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
	return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getRefreshToken(): string | null {
	return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null;
}

const SESSION_FLAG = "vx_session=1";

function setSessionCookie(flag: boolean) {
	if (!isBrowser()) return;
	if (flag) {
		const maxAge = 60 * 60 * 24 * 30;
		document.cookie = `${SESSION_FLAG}; path=/; max-age=${maxAge}; SameSite=Lax`;
	} else {
		document.cookie = "vx_session=; path=/; max-age=0";
	}
}

export function syncSessionCookieFromStorage() {
	if (!isBrowser() || !getToken()) return;
	if (document.cookie.includes("vx_session=1")) return;
	setSessionCookie(true);
}

export function saveAuth(token: string, user: AuthUser, refreshToken?: string) {
	if (!isBrowser()) return;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, JSON.stringify(user));
	if (refreshToken) {
		localStorage.setItem(REFRESH_KEY, refreshToken);
	}
	setSessionCookie(true);
}

export function getAuth():
	| { token: string; user: AuthUser; refreshToken: string | null }
	| null {
	if (!isBrowser()) return null;
	const token = localStorage.getItem(TOKEN_KEY);
	const rawUser = localStorage.getItem(USER_KEY);
	const refreshToken = localStorage.getItem(REFRESH_KEY);
	if (!token || !rawUser) return null;
	try {
		return { token, user: JSON.parse(rawUser) as AuthUser, refreshToken };
	} catch {
		return null;
	}
}

export function clearAuth() {
	if (!isBrowser()) return;
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(REFRESH_KEY);
	localStorage.removeItem(USER_KEY);
	setSessionCookie(false);
}
