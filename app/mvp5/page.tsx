"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mvp5Fetch, getTenantKey, saveTenantKey, clearTenantKey } from "@/lib/mvp5Api";

type Decision = {
	decision_id: string;
	decision_type: string;
	proposed_action: string;
	status: string;
	payload: Record<string, unknown>;
	created_at: string;
};

type EntityRow = { entity_id: string; entity_type: string; name: string | null };
type PolicyRow = { policy_id: string; policy_key: string; version: string; decision_type: string };

function statusColor(status: string) {
	if (["executed", "decided"].includes(status)) return "text-green";
	if (["blocked"].includes(status)) return "text-red";
	if (["escalated"].includes(status)) return "text-amber";
	return "text-tertiary";
}

export default function Mvp5Dashboard() {
	const [hasKey, setHasKey] = useState(false);
	const [keyInput, setKeyInput] = useState("");
	const [decisions, setDecisions] = useState<Decision[]>([]);
	const [entities, setEntities] = useState<EntityRow[]>([]);
	const [policies, setPolicies] = useState<PolicyRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCreate, setShowCreate] = useState(false);

	const [proposedBy, setProposedBy] = useState("");
	const [target, setTarget] = useState("");
	const [decisionType, setDecisionType] = useState("release_payment");
	const [proposedAction, setProposedAction] = useState("approve_transaction");
	const [amount, setAmount] = useState("1000");
	const [creating, setCreating] = useState(false);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const [dRes, eRes, pRes] = await Promise.all([
				mvp5Fetch("/api/decisions"),
				mvp5Fetch("/api/entities"),
				mvp5Fetch("/api/policies"),
			]);
			if (!dRes.ok) throw new Error("Invalid tenant API key, or the server rejected the request.");
			setDecisions(await dRes.json());
			setEntities(eRes.ok ? await eRes.json() : []);
			setPolicies(pRes.ok ? await pRes.json() : []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		const key = getTenantKey();
		setHasKey(Boolean(key));
		if (key) void load();
	}, []);

	function handleSaveKey() {
		if (!keyInput.trim()) return;
		saveTenantKey(keyInput);
		setHasKey(true);
		setKeyInput("");
		void load();
	}

	function handleChangeKey() {
		clearTenantKey();
		setHasKey(false);
		setDecisions([]);
	}

	async function handleCreateDecision(e: React.FormEvent) {
		e.preventDefault();
		if (!proposedBy) {
			setError("Pick a proposing Entity first — create one below if the list is empty.");
			return;
		}
		setCreating(true);
		setError(null);
		try {
			const res = await mvp5Fetch("/api/decisions", {
				method: "POST",
				body: JSON.stringify({
					proposed_by_entity_id: proposedBy,
					target_entity_id: target || undefined,
					decision_type: decisionType,
					proposed_action: proposedAction,
					payload: { amount: Number(amount) },
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || "Failed to create decision");
			await load();
			setShowCreate(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setCreating(false);
		}
	}

	async function handleQuickCreateEntity(entityType: string) {
		const res = await mvp5Fetch("/api/entities", { method: "POST", body: JSON.stringify({ entity_type: entityType, name: `${entityType}-${Date.now()}` }) });
		if (res.ok) await load();
	}

	if (!hasKey) {
		return (
			<main className="vx-home-surface min-h-screen w-full px-4 py-16 sm:px-6" style={{ color: "var(--text-primary)" }}>
				<div className="mx-auto max-w-md space-y-6">
					<div>
						<p className="vx-mono-label text-amber">AIM MVP5</p>
						<h1 className="vx-h3 mt-1">Trust &amp; Authority Layer</h1>
						<p className="vx-body-sm mt-2 text-secondary">
							This is a separate boundary from your Veraxius login. Paste a Tenant API key (from{" "}
							<code>seedMvp5Tenant.ts</code> or <code>POST /api/tenants</code>) to continue.
						</p>
					</div>
					<div className="vx-panel space-y-3 rounded-2xl p-5">
						<input
							type="password"
							value={keyInput}
							onChange={(e) => setKeyInput(e.target.value)}
							placeholder="Tenant API key"
							className="w-full rounded-lg border border-[var(--divider)] bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--amber-border)]"
						/>
						<button type="button" onClick={handleSaveKey} className="vx-btn-primary w-full rounded-lg py-3 text-sm font-semibold">
							Continue
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto w-full max-w-vx-content space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="vx-mono-label text-amber">AIM MVP5</p>
						<h1 className="vx-h3 mt-1">Trust &amp; Authority Layer</h1>
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={() => setShowCreate((v) => !v)} className="vx-btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
							New Decision
						</button>
						<button type="button" onClick={handleChangeKey} className="rounded-lg border border-[var(--divider)] px-4 py-2 text-sm text-secondary hover-bg-surface">
							Change tenant key
						</button>
					</div>
				</div>

				{error && <p className="vx-body-sm text-red">{error}</p>}

				{showCreate && (
					<section className="vx-panel rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Create a Decision</h2>
						<p className="mt-1 text-xs text-tertiary">A proposed action awaiting evaluation — nothing executes until it clears the Authority Gate.</p>

						{entities.length === 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								<p className="text-xs text-tertiary">No Entities yet:</p>
								<button type="button" onClick={() => handleQuickCreateEntity("ai_agent")} className="vx-feed-action rounded-md px-2 py-1 text-xs">
									+ ai_agent
								</button>
								<button type="button" onClick={() => handleQuickCreateEntity("organization")} className="vx-feed-action rounded-md px-2 py-1 text-xs">
									+ organization
								</button>
							</div>
						)}

						<form onSubmit={handleCreateDecision} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="text-xs text-secondary">
								Proposed by (Entity)
								<select value={proposedBy} onChange={(e) => setProposedBy(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--divider)] bg-transparent px-3 py-2 text-sm">
									<option value="">— select —</option>
									{entities.map((e) => (
										<option key={e.entity_id} value={e.entity_id}>
											{e.name ?? e.entity_id} ({e.entity_type})
										</option>
									))}
								</select>
							</label>
							<label className="text-xs text-secondary">
								Target (Entity, optional)
								<select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--divider)] bg-transparent px-3 py-2 text-sm">
									<option value="">— none —</option>
									{entities.map((e) => (
										<option key={e.entity_id} value={e.entity_id}>
											{e.name ?? e.entity_id} ({e.entity_type})
										</option>
									))}
								</select>
							</label>
							<label className="text-xs text-secondary">
								Decision type
								<input value={decisionType} onChange={(e) => setDecisionType(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--divider)] bg-transparent px-3 py-2 text-sm" />
							</label>
							<label className="text-xs text-secondary">
								Proposed action
								<input value={proposedAction} onChange={(e) => setProposedAction(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--divider)] bg-transparent px-3 py-2 text-sm" />
							</label>
							<label className="text-xs text-secondary">
								Amount (payload.amount)
								<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--divider)] bg-transparent px-3 py-2 text-sm" />
							</label>
							<div className="flex items-end">
								<button type="submit" disabled={creating} className="vx-btn-primary w-full rounded-lg py-2 text-sm font-semibold">
									{creating ? "Creating…" : "Create Decision"}
								</button>
							</div>
						</form>

						{policies.length === 0 && (
							<p className="mt-3 text-xs text-tertiary">No Policy yet for this tenant — create one via <code>POST /api/policies</code> before evaluating Authority.</p>
						)}
					</section>
				)}

				<section className="vx-panel rounded-2xl p-5 sm:p-6">
					<h2 className="text-base font-semibold">Recent Decisions</h2>
					{loading && <p className="mt-2 text-sm text-tertiary">Loading…</p>}
					{!loading && decisions.length === 0 && <p className="mt-2 text-sm text-tertiary">No decisions yet.</p>}
					<div className="mt-3 space-y-2">
						{decisions.map((d) => (
							<Link
								key={d.decision_id}
								href={`/mvp5/${d.decision_id}`}
								className="flex items-center justify-between gap-3 rounded-lg border border-[var(--divider)] px-3 py-2 hover-bg-surface"
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{d.decision_type} — {d.proposed_action}</p>
									<p className="text-xs text-tertiary">{d.decision_id}</p>
								</div>
								<span className={`shrink-0 text-xs font-semibold uppercase ${statusColor(d.status)}`}>{d.status}</span>
							</Link>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
