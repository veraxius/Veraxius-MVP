"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { TrustReceiptView, type TrustReceipt } from "@/components/TrustReceiptView";

/**
 * Public, no-login Trust Receipt view — this is what a "Share Receipt" link
 * points to. Access is gated server-side by the token query param, not by
 * a session, so this page never sends an auth header.
 */
export default function PublicReceiptPage() {
	const params = useParams<{ kind: string; id: string }>();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";
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
				const resp = await fetch(
					`${API_URL}/api/public/receipt/${kind}/${params.id}?token=${encodeURIComponent(token)}`,
					{ cache: "no-store" },
				);
				const json = await resp.json();
				if (!resp.ok) throw new Error(json?.error || "This receipt link is invalid or has expired");
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
	}, [kind, params.id, token]);

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			{loading && <p className="vx-body-sm text-center text-secondary">Loading…</p>}
			{error && <p className="vx-body-sm text-center text-red">{error}</p>}
			{receipt && <TrustReceiptView receipt={receipt} isPublic />}
		</main>
	);
}
