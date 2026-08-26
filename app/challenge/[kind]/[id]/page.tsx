"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { getAuth } from "@/lib/auth";

type EventContext = {
	userId: string;
	eventType: string;
	signal: string | null;
	domainLabel: string;
	delta: number;
	createdAt: string;
};

const REASON_OPTIONS = [
	{ value: "evidence_incorrect", label: "Evidence incorrect", hint: "The evidence attached doesn't support this signal." },
	{ value: "context_missing", label: "Context missing", hint: "There's important context this signal doesn't account for." },
	{ value: "not_my_activity", label: "Not my activity", hint: "This wasn't something you did." },
	{ value: "deadline_changed", label: "Deadline changed", hint: "The commitment deadline was renegotiated." },
	{ value: "verifier_disagreement", label: "Verifier disagreement", hint: "You disagree with how this was verified." },
	{ value: "other", label: "Other reason", hint: "Something else — explain below." },
] as const;

const ALLOWED_EVIDENCE_TYPES = [
	"image/jpeg",
	"image/png",
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

export default function ChallengeWizardPage() {
	const params = useParams<{ kind: string; id: string }>();
	const kind = params.kind === "domain-event" ? "domain-event" : "event";

	const [step, setStep] = useState(1);
	const [context, setContext] = useState<EventContext | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [reasons, setReasons] = useState<string[]>([]);
	const [severity, setSeverity] = useState<1 | 2 | 3 | null>(null);
	const [explanation, setExplanation] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [fileError, setFileError] = useState<string | null>(null);

	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [challenge, setChallenge] = useState<{ id: string; status: string; createdAt: string } | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const path = kind === "domain-event" ? "domain-events" : "events";
				const resp = await apiFetch(`${API_URL}/api/aim/${path}/${params.id}/receipt`, { cache: "no-store" });
				const json = await resp.json();
				if (!resp.ok) throw new Error(json?.error || "Failed to load the signal being challenged");
				if (!cancelled) {
					setContext({
						userId: json.userId,
						eventType: json.eventType,
						signal: json.signal,
						domainLabel: json.domainLabel,
						delta: json.delta,
						createdAt: json.createdAt,
					});
				}
			} catch (e) {
				if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unknown error");
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [kind, params.id]);

	function toggleReason(value: string) {
		setReasons((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const picked = Array.from(e.target.files ?? []);
		e.target.value = "";
		for (const f of picked) {
			if (!ALLOWED_EVIDENCE_TYPES.includes(f.type)) {
				setFileError(`${f.name}: unsupported file type`);
				return;
			}
			if (f.size > MAX_EVIDENCE_SIZE) {
				setFileError(`${f.name}: file must be 10MB or smaller`);
				return;
			}
		}
		setFileError(null);
		setFiles((prev) => [...prev, ...picked]);
	}

	async function handleSubmit() {
		if (!context) return;
		const auth = getAuth();
		if (!auth?.user?.id) {
			setSubmitError("Please login again");
			return;
		}

		setSubmitting(true);
		setSubmitError(null);
		try {
			const reasonText = [
				reasons.map((r) => REASON_OPTIONS.find((o) => o.value === r)?.label).filter(Boolean).join(", "),
				explanation.trim(),
			]
				.filter(Boolean)
				.join(" — ");

			const resp = await apiFetch(`${API_URL}/api/aim/challenge`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					targetUserId: context.userId,
					challengerId: auth.user.id,
					reason: reasonText || "No reason provided",
					severity: severity ?? 1,
					contextEventId: params.id,
					contextEventKind: kind,
				}),
			});
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || "Failed to submit challenge");

			const created = data.challenge as { id: string; status: string; createdAt: string };

			for (const file of files) {
				const formData = new FormData();
				formData.append("challengeId", created.id);
				formData.append("file", file);
				await apiFetch(`${API_URL}/api/evidence`, { method: "POST", body: formData }).catch(() => {
					// best-effort — a failed evidence upload shouldn't block the challenge itself
				});
			}

			setChallenge(created);
			setStep(4);
		} catch (e) {
			setSubmitError(e instanceof Error ? e.message : "Failed to submit challenge");
		} finally {
			setSubmitting(false);
		}
	}

	const stepLabels = ["Reason", "Evidence", "Review", "Resolution"];

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto w-full max-w-vx-content min-w-0 space-y-6">
				<div>
					<Link href={`/receipt/${kind}/${params.id}`} className="text-sm text-amber hover:underline">
						View Trust Receipt
					</Link>
					<h1 className="vx-h3 mt-2">Challenge an Event</h1>
					<p className="vx-body-sm mt-1 text-secondary">
						You have the right to challenge any signal in your record.
					</p>
				</div>

				{loadError && <p className="vx-body-sm text-red">{loadError}</p>}

				{context && (
					<section className="vx-panel rounded-2xl p-5">
						<p className="text-sm font-medium capitalize">{context.eventType.replace(/_/g, " ")}</p>
						<p className="text-xs text-tertiary">
							{context.signal ?? context.eventType} · {context.domainLabel} ·{" "}
							{new Date(context.createdAt).toLocaleDateString()}
						</p>
						<p className={`mt-1 text-sm font-semibold ${context.delta >= 0 ? "text-green" : "text-red"}`}>
							AIM impact: {context.delta >= 0 ? "+" : ""}
							{context.delta.toFixed(3)}
						</p>
					</section>
				)}

				<div className="flex items-center gap-2 text-xs">
					{stepLabels.map((label, i) => (
						<div key={label} className="flex items-center gap-2">
							<span
								className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
									step === i + 1
										? "border-amber bg-amber text-[var(--text-on-amber)]"
										: step > i + 1
											? "border-green text-green"
											: "border-[var(--divider)] text-tertiary"
								}`}
							>
								{i + 1}
							</span>
							<span className={step === i + 1 ? "font-medium" : "text-tertiary"}>{label}</span>
							{i < stepLabels.length - 1 && <span className="mx-1 text-tertiary">→</span>}
						</div>
					))}
				</div>

				{step === 1 && (
					<section className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Why are you challenging this event?</h2>
						<div className="space-y-2">
							{REASON_OPTIONS.map((opt) => (
								<label
									key={opt.value}
									className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--divider)] p-3"
								>
									<input
										type="checkbox"
										checked={reasons.includes(opt.value)}
										onChange={() => toggleReason(opt.value)}
										className="mt-1"
									/>
									<div>
										<p className="text-sm font-medium">{opt.label}</p>
										<p className="text-xs text-tertiary">{opt.hint}</p>
									</div>
								</label>
							))}
						</div>

						<div>
							<p className="mb-2 text-sm font-medium">Severity</p>
							<div className="flex gap-2">
								{[1, 2, 3].map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setSeverity(s as 1 | 2 | 3)}
										className={`rounded-lg border px-4 py-2 text-sm ${
											severity === s ? "border-amber bg-amber/10 text-amber" : "border-[var(--divider)] text-secondary"
										}`}
									>
										{s === 1 ? "Low" : s === 2 ? "Medium" : "High"}
									</button>
								))}
							</div>
						</div>

						<button
							type="button"
							disabled={reasons.length === 0 || severity === null}
							onClick={() => setStep(2)}
							className="vx-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
						>
							Continue
						</button>
					</section>
				)}

				{step === 2 && (
					<section className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Add context or evidence</h2>
						<div>
							<label className="mb-1 block text-sm font-medium">Explanation (optional)</label>
							<textarea
								value={explanation}
								onChange={(e) => setExplanation(e.target.value.slice(0, 500))}
								rows={4}
								placeholder="Add any context that helps explain your challenge…"
								className="w-full rounded-lg border border-[var(--divider)] bg-surface-subtle px-3 py-2 text-sm outline-none focus:border-[var(--amber-border)]"
							/>
							<p className="mt-1 text-right text-xs text-tertiary">{explanation.length}/500</p>
						</div>

						<div>
							<label className="vx-feed-action inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary">
								Add supporting evidence (PDF, JPG, PNG, DOCX, XLSX — max 10MB each)
								<input type="file" multiple className="sr-only" onChange={handleFileChange} />
							</label>
							{fileError && <p className="mt-1 text-xs text-red">{fileError}</p>}
							{files.length > 0 && (
								<ul className="mt-2 space-y-1">
									{files.map((f, i) => (
										<li key={`${f.name}-${i}`} className="flex items-center justify-between text-xs text-secondary">
											<span className="truncate">{f.name}</span>
											<button
												type="button"
												onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
												className="text-red"
											>
												Remove
											</button>
										</li>
									))}
								</ul>
							)}
						</div>

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setStep(1)}
								className="vx-btn-secondary rounded-lg px-5 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								onClick={() => setStep(3)}
								className="vx-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold"
							>
								Continue
							</button>
						</div>
					</section>
				)}

				{step === 3 && (
					<section className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6">
						<h2 className="text-base font-semibold">Review your challenge</h2>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-tertiary">Reasons</dt>
								<dd>{reasons.map((r) => REASON_OPTIONS.find((o) => o.value === r)?.label).join(", ")}</dd>
							</div>
							<div>
								<dt className="text-tertiary">Severity</dt>
								<dd>{severity === 1 ? "Low" : severity === 2 ? "Medium" : "High"}</dd>
							</div>
							{explanation && (
								<div>
									<dt className="text-tertiary">Explanation</dt>
									<dd className="whitespace-pre-wrap">{explanation}</dd>
								</div>
							)}
							<div>
								<dt className="text-tertiary">Evidence attached</dt>
								<dd>{files.length} file{files.length === 1 ? "" : "s"}</dd>
							</div>
						</dl>

						{submitError && <p className="text-sm text-red">{submitError}</p>}

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setStep(2)}
								className="vx-btn-secondary rounded-lg px-5 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								disabled={submitting}
								onClick={handleSubmit}
								className="vx-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
							>
								{submitting ? "Submitting…" : "Submit Challenge"}
							</button>
						</div>
					</section>
				)}

				{step === 4 && challenge && (
					<section className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6">
						<div className="rounded-lg border border-[var(--amber-border)] p-4">
							<p className="text-sm font-semibold text-amber">PENDING REVIEW</p>
							<p className="mt-1 text-sm text-secondary">
								Your challenge has been submitted. We&apos;ll review it within 2 business days.
							</p>
							<p className="mt-2 text-xs text-tertiary">
								Submitted {new Date(challenge.createdAt).toLocaleString()}
							</p>
						</div>

						<div>
							<h3 className="text-sm font-semibold">What happens next</h3>
							<ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-secondary">
								<li>Review by the Veraxius Engine</li>
								<li>Verifier / admin validation</li>
								<li>Decision made — you&apos;ll be notified</li>
								<li>Record updated — your AIM reflects the decision</li>
							</ol>
						</div>

						<p className="text-xs text-tertiary">
							Disputes don&apos;t remove data — they add context and improve trust for everyone.
						</p>
					</section>
				)}
			</div>
		</main>
	);
}
