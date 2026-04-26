"use client";

import { useCallback, useEffect, useState } from "react";

export type AimSummary = {
	user: { id: string; email: string; created_at: string };
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
	history_30d: { score: number; created_at: string }[];
};

export function useAIMScore(userId: string | undefined) {
	const [data, setData] = useState<AimSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
			setData(json as AimSummary);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Unknown error");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { summary: data, loading, error, refresh };
}
