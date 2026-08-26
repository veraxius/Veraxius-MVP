import { cn } from "@/lib/utils";

const STEPS = [
	{ title: "Observed", description: "Real behavior" },
	{ title: "Verified", description: "Evidence confirmed" },
	{ title: "Scored", description: "Signals weighted" },
	{ title: "Explained", description: "Always traceable" },
] as const;

/**
 * Shared "How AIM Works" sidebar block, reused across the AIM-explainability
 * screens introduced in MVP4 (Anatomy, Trust Receipt, ...). Purely
 * presentational — no data fetching.
 */
export function HowAimWorksPanel({ className }: { className?: string }) {
	return (
		<aside className={cn("vx-panel rounded-2xl p-5", className)}>
			<p className="vx-mono-label text-amber mb-4">How AIM Works</p>
			<ol className="space-y-4">
				{STEPS.map((step, i) => (
					<li key={step.title} className="flex items-start gap-3">
						<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--amber-border)] text-xs font-semibold text-amber">
							{i + 1}
						</span>
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
							<p className="text-xs text-[var(--text-tertiary)]">{step.description}</p>
						</div>
					</li>
				))}
			</ol>
		</aside>
	);
}
