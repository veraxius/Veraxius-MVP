import { API_URL } from "./api";

// MVP5 uses its own auth boundary — a per-Tenant API key (Bearer <raw key>),
// completely separate from the member JWT the rest of the app uses. Never
// reuse apiFetch()/getAuth() here; the Trust & Authority Layer is not scoped
// to a logged-in member at all — it can be called by external AI agents that
// have no Veraxius account.
const KEY = "vx_mvp5_tenant_key";
const OPERATOR_KEY = "vx_mvp5_operator_token";

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
	localStorage.removeItem(OPERATOR_KEY);
}

// A Tenant Operator is a real, authenticated human acting on behalf of a
// Tenant — required to approve or revoke an Authority (human_actor_id is no
// longer a free-text field). Separate token from the Tenant API key: the key
// identifies the organization, the operator token identifies the person.
export function getOperatorToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(OPERATOR_KEY);
}

export function saveOperatorToken(token: string) {
	if (typeof window === "undefined") return;
	localStorage.setItem(OPERATOR_KEY, token);
}

export function clearOperatorToken() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(OPERATOR_KEY);
}

export async function mvp5Fetch(path: string, init: RequestInit = {}): Promise<Response> {
	const key = getTenantKey();
	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");
	if (key) headers.set("Authorization", `Bearer ${key}`);
	const operatorToken = getOperatorToken();
	if (operatorToken) headers.set("X-Operator-Token", operatorToken);
	return fetch(`${API_URL}${path}`, { ...init, headers });
}
