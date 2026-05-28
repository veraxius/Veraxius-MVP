"use client";

import { useCallback, useEffect, useState } from "react";

export type AimSummary = {
	user: { id: string; email: string; created_at: string };
	/** Canonical global AIM 0–1 (same as `User.aimScore` / API field, not 0–100). */
	global_score: number;
	confidence_score: number;
	risk_level: "low" | "moderate" | "high" | "critical";
	aim_status: string;
	score_trend_30d: "up" | "down" | "flat";
	trend_delta_30d: number;
	top_drivers: {
		id: string;
		label: string;
		delta: number;
		impact: "positive" | "negative";
		delta_label: string;
		domain: string | null;
		created_at: string;
	}[];
	history_30d: { score: number; createdAt: string }[];
};

type HistoryRow = { score?: unknown; created_at?: unknown; createdAt?: unknown };

/** Normalizes API rows to `{ score, createdAt }` (ISO string). */
export function normalizeHistory30d(raw: unknown): AimSummary["history_30d"] {
	if (!Array.isArray(raw)) return [];

	return raw
		.map((item): AimSummary["history_30d"][number] | null => {
			if (!item || typeof item !== "object") return null;
			const row = item as HistoryRow;
			const score = Number(row.score);
			const dateRaw =
				(typeof row.createdAt === "string" && row.createdAt) ||
				(typeof row.created_at === "string" && row.created_at) ||
				null;
			if (!Number.isFinite(score) || !dateRaw) return null;

			const t = Date.parse(dateRaw);
			if (!Number.isFinite(t)) return null;

			return { score, createdAt: new Date(t).toISOString() };
		})
		.filter((row): row is AimSummary["history_30d"][number] => row !== null);
}

export function useAIMScore(
	userId: string | undefined,
	options?: { pollIntervalMs?: number },
) {
	const [data, setData] = useState<AimSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const pollIntervalMs = options?.pollIntervalMs;

	const refresh = useCallback(async () => {
		if (!userId) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const resp = await fetch(`/api/users/${userId}/aim-summary`, { cache: "no-store" });
			const json = await resp.json();
			if (!resp.ok) throw new Error(json?.error || "Failed to load AIM summary");

			const body = json as AimSummary & { history_30d?: unknown };
			setData({
				...body,
				history_30d: normalizeHistory30d(body.history_30d),
			});
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Unknown error");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		void refresh();
		if (!pollIntervalMs) return;
		const id = setInterval(() => void refresh(), pollIntervalMs);
		return () => clearInterval(id);
	}, [refresh, pollIntervalMs]);

	return { summary: data, loading, error, refresh };
}
