import { API_URL } from "./api";

// MVP5 uses its own auth boundary — a per-Tenant API key (Bearer <raw key>),
// completely separate from the member JWT the rest of the app uses. Never
// reuse apiFetch()/getAuth() here; the Trust & Authority Layer is not scoped
// to a logged-in member at all — it can be called by external AI agents that
// have no Veraxius account.
const KEY = "vx_mvp5_tenant_key";

export function getTenantKey(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(KEY);
}

export function saveTenantKey(key: string) {
	if (typeof window === "undefined") return;
	localStorage.setItem(KEY, key.trim());
}

export function clearTenantKey() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(KEY);
}

export async function mvp5Fetch(path: string, init: RequestInit = {}): Promise<Response> {
	const key = getTenantKey();
	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");
	if (key) headers.set("Authorization", `Bearer ${key}`);
	return fetch(`${API_URL}${path}`, { ...init, headers });
}
