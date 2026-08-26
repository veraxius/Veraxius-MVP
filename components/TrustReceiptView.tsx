"use client";

import { useState } from "react";
import Link from "next/link";

export type TrustReceipt = {
	kind: "event" | "domain-event";
	id: string;
	userId: string;
	userName: string | null;
	eventType: string;
	signal: string | null;
	domain: string;
	domainLabel: string;
	delta: number;
	createdAt: string;
	contentHash: string;
	policyApplied: string;
	confidence: number;
	evidence: {
		id: string;
		fileName: string;
		fileUrl: string;
		fileType: string;
		fileSize: number;
		status: string;
		createdAt: string;
	}[];
	signalDetails: {
		repeatable: boolean;
		firstOccurrence: string | null;
		lastOccurrence: string | null;
		occurrenceCount: number;
		decayApplies: boolean;
	};
	shareUrl: string;
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					// ignore — clipboard may be unavailable
				}
			}}
			className="vx-feed-action rounded-md px-2 py-1 text-xs text-secondary"
		>
			{copied ? "Copied!" : label}
		</button>
	);
}

export function TrustReceiptView({
	receipt,
	isPublic = false,
}: {
	receipt: TrustReceipt;
	isPublic?: boolean;
}) {
	return (
		<div className="mx-auto w-full max-w-vx-content min-w-0 space-y-6">
			<div>
				<p className="vx-mono-label text-green">TRUST RECEIPT™ — VERIFIED</p>
				<p className="vx-body-sm mt-1 text-secondary">
					Every score movement is backed by evidence. Every receipt leaves a trace.
				</p>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<span className="vx-mono-sm text-tertiary">
						Receipt ID: {receipt.kind}-{receipt.id.slice(0, 8)}
					</span>
					<CopyButton value={`${receipt.kind}-${receipt.id}`} label="Copy ID" />
					{!isPublic && <CopyButton value={receipt.shareUrl} label="Share Receipt" />}
				</div>
			</div>

			<section className="vx-panel rounded-2xl p-5 sm:p-6">
				<h1 className="text-lg font-semibold capitalize">{receipt.eventType.replace(/_/g, " ")}</h1>
				<p className="vx-body-sm mt-1 text-secondary">
					{receipt.signal ?? receipt.eventType} · {receipt.domainLabel}
				</p>

				<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<p className="vx-mono-label text-tertiary">Owner</p>
						<p className="text-sm font-medium">{receipt.userName ?? "—"}</p>
					</div>
					<div>
						<p className="vx-mono-label text-tertiary">Domain</p>
						<p className="text-sm font-medium">{receipt.domainLabel}</p>
					</div>
					<div>
						<p className="vx-mono-label text-tertiary">Recorded</p>
						<p className="text-sm font-medium">{new Date(receipt.createdAt).toLocaleString()}</p>
					</div>
					<div>
						<p className="vx-mono-label text-tertiary">Confidence</p>
						<p className="text-sm font-medium">{(receipt.confidence * 100).toFixed(0)}%</p>
					</div>
					<div>
						<p className="vx-mono-label text-tertiary">Policy Applied</p>
						<p className="text-sm font-medium">{receipt.policyApplied}</p>
					</div>
					<div>
						<p className="vx-mono-label text-tertiary">AIM Impact</p>
						<p className={`text-sm font-semibold ${receipt.delta >= 0 ? "text-green" : "text-red"}`}>
							{receipt.delta >= 0 ? "+" : ""}
							{receipt.delta.toFixed(3)}
						</p>
					</div>
				</div>
			</section>

			<section className="vx-panel rounded-2xl p-5 sm:p-6">
				<div className="flex items-center justify-between">
					<h2 className="text-base font-semibold">Evidence ({receipt.evidence.length})</h2>
				</div>
				{receipt.evidence.length === 0 ? (
					<p className="mt-2 text-sm text-tertiary">No evidence files attached to this signal.</p>
				) : (
					<div className="mt-3 space-y-2">
						{receipt.evidence.map((ev) => (
							<a
								key={ev.id}
								href={ev.fileUrl}
								target="_blank"
								rel="noreferrer"
								className="vx-feed-action flex items-center justify-between gap-3 rounded-lg px-3 py-2"
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{ev.fileName}</p>
									<p className="text-xs text-tertiary">
										{formatBytes(ev.fileSize)} · {new Date(ev.createdAt).toLocaleDateString()}
									</p>
								</div>
								<span className="shrink-0 rounded-full border border-green/40 bg-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-green">
									{ev.status}
								</span>
							</a>
						))}
					</div>
				)}
			</section>

			<section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="vx-panel rounded-2xl p-5 sm:p-6">
					<h3 className="text-base font-semibold">Signal Details</h3>
					<dl className="mt-3 space-y-2 text-sm">
						<div className="flex justify-between">
							<dt className="text-secondary">Repeatable</dt>
							<dd>{receipt.signalDetails.repeatable ? "Yes" : "No"}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-secondary">Decay</dt>
							<dd>{receipt.signalDetails.decayApplies ? "Recency-weighted" : "None"}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-secondary">Occurrences</dt>
							<dd>{receipt.signalDetails.occurrenceCount}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-secondary">First Occurrence</dt>
							<dd>
								{receipt.signalDetails.firstOccurrence
									? new Date(receipt.signalDetails.firstOccurrence).toLocaleDateString()
									: "—"}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-secondary">Last Occurrence</dt>
							<dd>
								{receipt.signalDetails.lastOccurrence
									? new Date(receipt.signalDetails.lastOccurrence).toLocaleDateString()
									: "—"}
							</dd>
						</div>
					</dl>
				</div>

				<div className="vx-panel rounded-2xl p-5 sm:p-6">
					<h3 className="text-base font-semibold">Governance &amp; Traceability</h3>
					<dl className="mt-3 space-y-2 text-sm">
						<div className="flex justify-between">
							<dt className="text-secondary">Recorded By</dt>
							<dd>Veraxius Engine</dd>
						</div>
						<div className="flex items-center justify-between gap-2">
							<dt className="shrink-0 text-secondary">Immutable Hash</dt>
							<dd className="min-w-0 truncate font-mono text-xs" title={receipt.contentHash}>
								{receipt.contentHash.slice(0, 16)}…
							</dd>
						</div>
					</dl>
					<p className="mt-3 text-xs text-tertiary">
						SHA-256 of this record&apos;s own fields — tamper-evident within Veraxius, not a blockchain
						or external notarization.
					</p>

					{!isPublic && (
						<div className="mt-4 border-t border-[var(--divider)] pt-4">
							<p className="text-sm">Something incorrect or missing?</p>
							<Link
								href={`/challenge/${receipt.kind}/${receipt.id}`}
								className="vx-btn-secondary mt-2 inline-block rounded-lg px-4 py-2 text-xs font-semibold"
							>
								Challenge Event
							</Link>
						</div>
					)}
				</div>
			</section>

			<p className="text-center text-xs text-tertiary">
				Every receipt is auditable. Every decision is traceable. That&apos;s how trust is built.
			</p>
		</div>
	);
}
