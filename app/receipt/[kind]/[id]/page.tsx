"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { TrustReceiptView, type TrustReceipt } from "@/components/TrustReceiptView";

export default function ReceiptPage() {
	const params = useParams<{ kind: string; id: string }>();
	const kind = params.kind === "domain-event" ? "domain-event" : "event";

	const [receipt, setReceipt] = useState<TrustReceipt | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				setLoading(true);
				setError(null);
				const path = kind === "domain-event" ? "domain-events" : "events";
				const resp = await apiFetch(`${API_URL}/api/aim/${path}/${params.id}/receipt`, { cache: "no-store" });
				const json = await resp.json();
				if (!resp.ok) throw new Error(json?.error || "Failed to load receipt");
				if (!cancelled) setReceipt(json as TrustReceipt);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [kind, params.id]);

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			{loading && <p className="vx-body-sm text-center text-secondary">Loading…</p>}
			{error && <p className="vx-body-sm text-center text-red">{error}</p>}
			{receipt && <TrustReceiptView receipt={receipt} />}
		</main>
	);
}
