"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { mvp5Fetch, getOperatorToken, saveOperatorToken } from "@/lib/mvp5Api";

type TrustState = {
	trust_state_id: string;
	trust_score: number;
	trust_class: string;
	evidence_confidence: number;
	dimensions: Record<string, number | null>;
	explanation: unknown;
	evaluated_at: string;
};

type Authority = {
	authority_id: string;
	authority_state: string;
	status: string;
	reason_codes: string[] | null;
	constraints: Record<string, unknown> | null;
	human_required: boolean;
	supersedes_authority_id: string | null;
	policy_version: string | null;
	created_at: string;
	expires_at: string | null;
};

type ActionRow = { action_id: string; authority_id: string; action_type: string; status: string; executed_at: string | null };
type OutcomeRow = { outcome_id: string; action_id: string; outcome_type: string; success: boolean; observed_at: string };

type DecisionDetail = {
	decision_id: string;
	decision_type: string;
	proposed_action: string;
	status: string;
	payload: Record<string, unknown>;
	created_at: string;
	trust_states: TrustState[];
	authorities: Authority[];
	actions: ActionRow[];
	outcomes: OutcomeRow[];
};

type PolicyRow = { policy_id: string; policy_key: string; version: string; decision_type: string };

type GovernanceEventRow = {
	event_type: string;
	event_payload: unknown;
	rejected_alternatives: unknown;
	policy_version: string | null;
	human_actor_id: string | null;
	previous_hash: string | null;
	event_hash: string;
	created_at: string;
};

const AUTHORITY_COLOR: Record<string, string> = {
	EXECUTE: "text-green",
	CONSTRAIN: "text-amber",
	CHALLENGE: "text-amber",
	ESCALATE: "text-amber",
	BLOCK: "text-red",
};

export default function Mvp5DecisionDetail() {
	const params = useParams<{ decisionId: string }>();
	const decisionId = params.decisionId;

	const [detail, setDetail] = useState<DecisionDetail | null>(null);
	const [policies, setPolicies] = useState<PolicyRow[]>([]);
	const [governance, setGovernance] = useState<{ chain_valid: boolean; events: GovernanceEventRow[] } | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPolicy, setSelectedPolicy] = useState("");
	const [showGovernance, setShowGovernance] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [dRes, pRes] = await Promise.all([mvp5Fetch(`/api/decisions/${decisionId}`), mvp5Fetch("/api/policies")]);
			if (!dRes.ok) throw new Error((await dRes.json())?.error ?? "Failed to load decision");
			setDetail(await dRes.json());
			if (pRes.ok) setPolicies(await pRes.json());
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, [decisionId]);

	useEffect(() => {
		void load();
	}, [load]);

	async function loadGovernance() {
		setShowGovernance(true);
		const res = await mvp5Fetch(`/api/decisions/${decisionId}/governance`);
		if (res.ok) setGovernance(await res.json());
	}

	async function run(fn: () => Promise<Response>) {
		setBusy(true);
		setError(null);
		try {
			const res = await fn();
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? "Request failed");
			await load();
			if (showGovernance) await loadGovernance();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setBusy(false);
		}
	}

	if (loading) return <main className="p-8 text-secondary">Loading…</main>;
	if (!detail) return <main className="p-8 text-red">{error ?? "Not found"}</main>;

	const latestTrust = detail.trust_states[detail.trust_states.length - 1] ?? null;
	const latestAuthority = detail.authorities[detail.authorities.length - 1] ?? null;
	const escalatedPending = detail.authorities.find((a) => a.authority_state === "ESCALATE" && a.status === "issued");
	const activeAuthority = detail.authorities.find((a) => a.status === "active" && ["EXECUTE", "CONSTRAIN"].includes(a.authority_state));
	const executedAction = detail.actions.find((a) => a.status === "executed" && !detail.outcomes.some((o) => o.action_id === a.action_id));

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto w-full max-w-vx-content space-y-6">
				<Link href="/mvp5" className="text-sm text-amber hover:underline">← Back</Link>

				<section className="vx-panel rounded-2xl p-5 sm:p-6">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h1 className="vx-h3">{detail.decision_type} — {detail.proposed_action}</h1>
						<span className="text-xs font-semibold uppercase text-tertiary">{detail.status}</span>
					</div>
					<p className="mt-1 font-mono text-xs text-tertiary">{detail.decision_id}</p>
					<pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--panel)] p-3 text-xs">{JSON.stringify(detail.payload, null, 2)}</pre>
				</section>

				{error && <p className="vx-body-sm text-red">{error}</p>}

				{/* Trust */}
				<section className="vx-panel rounded-2xl p-5 sm:p-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold">Trust State</h2>
						<button disabled={busy} onClick={() => run(() => mvp5Fetch("/api/trust/evaluate", { method: "POST", body: JSON.stringify({ decision_id: decisionId }) }))} className="vx-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">
							Evaluate Trust
						</button>
					</div>
					{!latestTrust && <p className="mt-2 text-sm text-tertiary">Not evaluated yet.</p>}
					{latestTrust && (
						<div className="mt-3">
							<div className="flex items-baseline gap-3">
								<span className="text-3xl font-bold text-amber">{latestTrust.trust_score.toFixed(1)}</span>
								<span className="text-sm font-semibold">{latestTrust.trust_class}</span>
								<span className="text-xs text-tertiary">evidence confidence {latestTrust.evidence_confidence.toFixed(0)}%</span>
							</div>
							<div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
								{Object.entries(latestTrust.dimensions).map(([k, v]) => (
									<div key={k} className="rounded-md border border-[var(--divider)] px-2 py-1">
										<span className="text-tertiary">{k}: </span>
										<span className="font-medium">{v === null ? "—" : v.toFixed(0)}</span>
									</div>
								))}
							</div>
							<p className="mt-2 text-xs text-tertiary">{detail.trust_states.length} evaluation(s) — each one a separate, immutable row.</p>
						</div>
					)}
				</section>

				{/* Authority */}
				<section className="vx-panel rounded-2xl p-5 sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="text-base font-semibold">Authority</h2>
						{latestTrust && !latestAuthority && (
							<div className="flex items-center gap-2">
								<select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)} className="rounded-lg border border-[var(--divider)] bg-transparent px-2 py-1.5 text-xs">
									<option value="">— select policy —</option>
									{policies.map((p) => (
										<option key={p.policy_id} value={p.policy_id}>{p.policy_key} v{p.version}</option>
									))}
								</select>
								<button
									disabled={busy || !selectedPolicy}
									onClick={() => run(() => mvp5Fetch("/api/authority/evaluate", { method: "POST", body: JSON.stringify({ decision_id: decisionId, trust_state_id: latestTrust.trust_state_id, policy_id: selectedPolicy }) }))}
									className="vx-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
								>
									Evaluate Authority
								</button>
							</div>
						)}
					</div>

					{detail.authorities.length === 0 && <p className="mt-2 text-sm text-tertiary">No authority decision yet.</p>}

					<div className="mt-3 space-y-2">
						{detail.authorities.map((a) => (
							<div key={a.authority_id} className="rounded-lg border border-[var(--divider)] px-3 py-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className={`text-sm font-bold ${AUTHORITY_COLOR[a.authority_state] ?? ""}`}>{a.authority_state}</span>
									<span className="text-xs text-tertiary">{a.status}{a.supersedes_authority_id ? ` · supersedes ${a.supersedes_authority_id.slice(0, 14)}…` : ""}</span>
								</div>
								<p className="mt-1 text-xs text-tertiary">reasons: {(a.reason_codes ?? []).join(", ") || "—"}</p>
								{a.constraints && <p className="mt-1 text-xs text-tertiary">envelope: {JSON.stringify(a.constraints)}</p>}
							</div>
						))}
					</div>

					{escalatedPending && (
						<OperatorGate>
							<ApproveForm authorityId={escalatedPending.authority_id} busy={busy} onApprove={(grant, reason) =>
								run(() => mvp5Fetch(`/api/authority/${escalatedPending.authority_id}/approve`, { method: "POST", body: JSON.stringify({ grant, reason }) }))
							} />
						</OperatorGate>
					)}
				</section>

				{/* Action */}
				{activeAuthority && (
					<section className="vx-panel rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Execute Action</h2>
						<p className="mt-1 text-xs text-tertiary">Authority {activeAuthority.authority_id.slice(0, 14)}… is ACTIVE and single-use.</p>
						<button
							disabled={busy}
							onClick={() => run(() => mvp5Fetch("/api/actions", {
								method: "POST",
								body: JSON.stringify({
									decision_id: decisionId,
									authority_id: activeAuthority.authority_id,
									action_type: detail.proposed_action,
									payload: detail.payload,
									idempotency_key: `${decisionId}-${activeAuthority.authority_id}`,
								}),
							}))}
							className="vx-btn-primary mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
						>
							Execute
						</button>
					</section>
				)}

				{detail.actions.length > 0 && (
					<section className="vx-panel rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Actions &amp; Outcomes</h2>
						<div className="mt-3 space-y-2">
							{detail.actions.map((a) => {
								const outcome = detail.outcomes.find((o) => o.action_id === a.action_id);
								return (
									<div key={a.action_id} className="rounded-lg border border-[var(--divider)] px-3 py-2 text-sm">
										<p>{a.action_type} — <span className="text-tertiary">{a.status}</span></p>
										{outcome ? (
											<p className="mt-1 text-xs">
												Outcome: <span className={outcome.success ? "text-green" : "text-red"}>{outcome.outcome_type} ({outcome.success ? "success" : "failure"})</span>
											</p>
										) : (
											executedAction?.action_id === a.action_id && (
												<div className="mt-2 flex gap-2">
													<button disabled={busy} onClick={() => run(() => mvp5Fetch("/api/outcomes", { method: "POST", body: JSON.stringify({ action_id: a.action_id, outcome_type: "verified", success: true }) }))} className="rounded-md bg-green/10 px-2 py-1 text-xs font-semibold text-green">
														Record success
													</button>
													<button disabled={busy} onClick={() => run(() => mvp5Fetch("/api/outcomes", { method: "POST", body: JSON.stringify({ action_id: a.action_id, outcome_type: "disputed", success: false }) }))} className="rounded-md bg-red/10 px-2 py-1 text-xs font-semibold text-red">
														Record failure
													</button>
												</div>
											)
										)}
									</div>
								);
							})}
						</div>
					</section>
				)}

				{/* Governance */}
				<section className="vx-panel rounded-2xl p-5 sm:p-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold">Governance Log</h2>
						<button onClick={loadGovernance} className="vx-feed-action rounded-md px-3 py-1.5 text-xs">
							{showGovernance ? "Refresh" : "Show lineage"}
						</button>
					</div>
					{showGovernance && governance && (
						<div className="mt-3">
							<p className={`text-xs font-semibold ${governance.chain_valid ? "text-green" : "text-red"}`}>
								Hash chain: {governance.chain_valid ? "VALID — untampered" : "INVALID — tampering detected"}
							</p>
							<div className="mt-2 space-y-2">
								{governance.events.map((e, i) => (
									<div key={i} className="rounded-lg border border-[var(--divider)] px-3 py-2 text-xs">
										<p className="font-semibold">{e.event_type}</p>
										<p className="mt-1 text-tertiary">{JSON.stringify(e.event_payload)}</p>
										{Array.isArray(e.rejected_alternatives) && e.rejected_alternatives.length > 0 && (
											<p className="mt-1 text-tertiary">rejected: {JSON.stringify(e.rejected_alternatives)}</p>
										)}
										<p className="mt-1 font-mono text-[10px] text-tertiary">hash {e.event_hash.slice(0, 16)}…</p>
									</div>
								))}
							</div>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

function ApproveForm({ authorityId, busy, onApprove }: { authorityId: string; busy: boolean; onApprove: (grant: "EXECUTE" | "CONSTRAIN" | "BLOCK", reason: string) => void }) {
	const [reason, setReason] = useState("");
	const [grant, setGrant] = useState<"EXECUTE" | "CONSTRAIN" | "BLOCK">("EXECUTE");

	return (
		<div className="mt-4 rounded-lg border border-[var(--amber-border)] p-3">
			<p className="text-sm font-semibold">Human review required</p>
			<p className="mt-1 text-xs text-tertiary">Authority {authorityId.slice(0, 14)}… is escalated. Trust ≠ authority — this decision needs an explicit human call.</p>
			<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
				<select value={grant} onChange={(e) => setGrant(e.target.value as typeof grant)} className="rounded-lg border border-[var(--divider)] bg-transparent px-2 py-1.5 text-xs">
					<option value="EXECUTE">Grant EXECUTE</option>
					<option value="CONSTRAIN">Grant CONSTRAIN</option>
					<option value="BLOCK">BLOCK instead</option>
				</select>
				<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-lg border border-[var(--divider)] bg-transparent px-2 py-1.5 text-xs" />
			</div>
			<button disabled={busy} onClick={() => onApprove(grant, reason)} className="vx-btn-primary mt-2 rounded-lg px-4 py-1.5 text-xs font-semibold">
				Submit decision
			</button>
		</div>
	);
}

// Approvals/revocations require a real, authenticated Tenant Operator
// (X-Operator-Token) instead of a client-supplied human_actor_id string.
// This gate logs one in (or registers one, first time) before showing
// whatever human-review action it wraps.
function OperatorGate({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(() => Boolean(getOperatorToken()));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function login(register: boolean) {
		setBusy(true);
		setError(null);
		try {
			if (register) {
				const regRes = await mvp5Fetch("/api/tenant-operators", { method: "POST", body: JSON.stringify({ email, password }) });
				if (!regRes.ok && regRes.status !== 409) {
					const data = await regRes.json();
					throw new Error(data?.error ?? "Failed to register operator");
				}
			}
			const res = await mvp5Fetch("/api/tenant-operators/login", { method: "POST", body: JSON.stringify({ email, password }) });
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? "Invalid operator credentials");
			saveOperatorToken(data.operator_token);
			setReady(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setBusy(false);
		}
	}

	if (ready) return <>{children}</>;

	return (
		<div className="mt-4 rounded-lg border border-[var(--divider)] p-3">
			<p className="text-sm font-semibold">Sign in as a Tenant Operator</p>
			<p className="mt-1 text-xs text-tertiary">A human review needs a real, authenticated identity — not a free-text name. First time here? Register creates your operator account for this tenant.</p>
			<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
				<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-lg border border-[var(--divider)] bg-transparent px-2 py-1.5 text-xs" />
				<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="rounded-lg border border-[var(--divider)] bg-transparent px-2 py-1.5 text-xs" />
			</div>
			{error && <p className="mt-2 text-xs text-red">{error}</p>}
			<div className="mt-2 flex gap-2">
				<button disabled={busy || !email || !password} onClick={() => login(false)} className="vx-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">
					Log in
				</button>
				<button disabled={busy || !email || !password} onClick={() => login(true)} className="rounded-lg border border-[var(--divider)] px-3 py-1.5 text-xs text-secondary hover-bg-surface">
					Register + Log in
				</button>
			</div>
		</div>
	);
}
