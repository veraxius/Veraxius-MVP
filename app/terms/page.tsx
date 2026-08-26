import Link from "next/link";

export const metadata = {
	title: "Terms of Service | Veraxius",
};

export default function TermsPage() {
	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-10 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto w-full max-w-2xl min-w-0 space-y-6">
				<div>
					<Link href="/" className="text-sm text-amber hover:underline">
						← Back
					</Link>
					<h1 className="vx-h3 mt-2">Terms of Service</h1>
				</div>

				<div className="rounded-lg border border-[var(--amber-border)] bg-[var(--amber-glow-subtle)] p-4">
					<p className="text-sm font-semibold text-amber">Draft — pending legal review</p>
					<p className="mt-1 text-sm text-secondary">
						This is a placeholder version of our Terms of Service, provided so you know generally what to
						expect. It has not yet been reviewed by legal counsel and will be replaced with a final version
						before general availability.
					</p>
				</div>

				<div className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6 text-sm text-secondary">
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">1. Using Veraxius</h2>
						<p className="mt-1">
							Veraxius provides tools to record, verify, and explain trust-relevant activity through the
							AIM (Adaptive Integrity Metric) score. By creating an account, you agree to use the service
							honestly and not to submit false claims, forged evidence, or attempt to manipulate scores.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">2. Your account</h2>
						<p className="mt-1">
							You&apos;re responsible for keeping your account credentials secure and for activity that
							happens under your account.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">3. Content and evidence</h2>
						<p className="mt-1">
							Any evidence you upload should be accurate and something you have the right to share. You
							can challenge any signal recorded against you — see our disputes process.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">4. Changes</h2>
						<p className="mt-1">
							We may update these terms as the product evolves. Material changes will be communicated
							before they take effect.
						</p>
					</section>
				</div>

				<p className="text-center text-xs text-tertiary">
					See also our <Link href="/privacy" className="text-amber hover:underline">Privacy Policy</Link>.
				</p>
			</div>
		</main>
	);
}
