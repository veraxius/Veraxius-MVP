import Link from "next/link";

export const metadata = {
	title: "Privacy Policy | Veraxius",
};

export default function PrivacyPage() {
	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-10 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto w-full max-w-2xl min-w-0 space-y-6">
				<div>
					<Link href="/" className="text-sm text-amber hover:underline">
						← Back
					</Link>
					<h1 className="vx-h3 mt-2">Privacy Policy</h1>
				</div>

				<div className="rounded-lg border border-[var(--amber-border)] bg-[var(--amber-glow-subtle)] p-4">
					<p className="text-sm font-semibold text-amber">Draft — pending legal review</p>
					<p className="mt-1 text-sm text-secondary">
						This is a placeholder Privacy Policy describing our general approach. It has not yet been
						reviewed by legal counsel and will be replaced with a final version before general
						availability.
					</p>
				</div>

				<div className="vx-panel space-y-4 rounded-2xl p-5 sm:p-6 text-sm text-secondary">
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">What we collect</h2>
						<p className="mt-1">
							Account details you provide (name, email), activity you generate on the platform (posts,
							messages, commitments, evidence you upload), and technical data needed to operate the
							service.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">How we use it</h2>
						<p className="mt-1">
							To calculate your AIM score from verifiable signals, to operate core features (feed,
							messaging, disputes), and to keep the platform secure.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">Your control</h2>
						<p className="mt-1">
							You decide what evidence to attach to your record, and you can challenge any signal you
							believe is incorrect. We do not sell your data.
						</p>
					</section>
					<section>
						<h2 className="text-base font-semibold text-[var(--text-primary)]">Third parties</h2>
						<p className="mt-1">
							We use third-party infrastructure providers (for example, cloud file storage and
							authentication providers like Google) strictly to operate the service.
						</p>
					</section>
				</div>

				<p className="text-center text-xs text-tertiary">
					See also our <Link href="/terms" className="text-amber hover:underline">Terms of Service</Link>.
				</p>
			</div>
		</main>
	);
}
