import { clearAuth, getAuth, getRefreshToken, saveAuth } from "./auth";

function resolveApiUrl(): string {
	const url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
	if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
		throw new Error("NEXT_PUBLIC_BACKEND_URL must use HTTPS in production");
	}
	return url;
}

export const API_URL = resolveApiUrl();

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	const refreshToken = getRefreshToken();
	if (!refreshToken) {
		clearAuth();
		return null;
	}

	const res = await fetch(`${API_URL}/api/auth/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refresh_token: refreshToken }),
	});

	if (!res.ok) {
		clearAuth();
		return null;
	}

	const data = await res.json();
	const token = (data.access_token || data.token) as string | undefined;
	if (!token) {
		clearAuth();
		return null;
	}

	const auth = getAuth();
	if (auth) {
		saveAuth(token, auth.user, refreshToken);
	}
	return token;
}

/**
 * Fetch wrapper that attaches the JWT, refreshes on 401 once, and retries.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	const auth = getAuth();
	const sentAuth = headers.has("Authorization") || Boolean(auth?.token);

	if (auth?.token && !headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${auth.token}`);
	}

	let response = await fetch(input, { ...init, headers });

	if (response.status === 401 && sentAuth) {
		if (!refreshPromise) {
			refreshPromise = refreshAccessToken().finally(() => {
				refreshPromise = null;
			});
		}
		const newToken = await refreshPromise;
		if (newToken) {
			headers.set("Authorization", `Bearer ${newToken}`);
			response = await fetch(input, { ...init, headers });
		}
	}

	return response;
}
