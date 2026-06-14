"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getAuth } from "@/lib/auth";
import { formatAimScoreLabel } from "@/lib/aimDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VeraxiusLogo } from "@/components/VeraxiusLogo";
export function NavBar() {
	const pathname = usePathname();
	const router = useRouter();
	const [aim, setAim] = useState<{ score: number; status: string } | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);

	useEffect(() => {
		const auth = getAuth();
		const userId = auth?.user?.id;
		let timer: ReturnType<typeof setInterval> | null = null;
		async function load() {
			if (!userId) return;
			try {
				const resp = await fetch(`/api/users/${userId}/aim-summary`, { cache: "no-store" });
				const data = await resp.json();
				if (resp.ok && typeof data?.global_score === "number") {
					setAim({
						score: Number(data.global_score),
						status: String(data.aim_status ?? "stable"),
					});
				}
			} catch {
				// ignore
			}
		}
		load();
		timer = setInterval(load, 10000);
		function onQuickRefresh() {
			void load();
		}
		window.addEventListener("vx-aim-refresh", onQuickRefresh);
		return () => {
			if (timer) clearInterval(timer);
			window.removeEventListener("vx-aim-refresh", onQuickRefresh);
		};
	}, [pathname]);

	if (pathname === "/login" || pathname === "/register") return null;

	const isHome = pathname === "/home" || pathname === "/";
	const isMessages = pathname === "/messages";
	const showActions = isHome || isMessages;

	const navIconBtn =
		"inline-flex items-center justify-center rounded-full px-4 min-h-11 text-sm font-semibold bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-glow)] transition-colors";

	function handleSignOut() {
		clearAuth();
		router.replace("/login");
		router.refresh();
	}

	return (
		<header
			className="w-full sticky top-0 z-40"
			style={{ backgroundColor: "var(--bg-panel)", borderBottom: "0.1px solid var(--amber)" }}
		>
			<div className="w-full max-w-[100vw] px-4 sm:px-6 lg:px-8">
				<div className="grid h-14 sm:h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2 min-w-0">
					<Link
						href="/home"
						aria-label="Veraxius Home"
						className="inline-flex items-center justify-self-start shrink-0 min-h-11 overflow-visible min-w-0"
					>
						<VeraxiusLogo variant="navbar" priority />
					</Link>

					<div className="flex justify-center px-1 min-w-0">
						{showActions && aim ? (
							<span className="inline-flex items-center rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 min-h-8 sm:min-h-11 border border-[var(--divider)] text-[10px] sm:text-xs text-[var(--text-secondary)] whitespace-nowrap max-w-full">
								<span className="vx-mono text-amber vx-aim-neon mr-0.5 sm:mr-1 shrink-0">AIM</span>
								<span className="font-semibold text-[var(--text-primary)] truncate">
									{formatAimScoreLabel(aim.score)}
								</span>
							</span>
						) : null}
					</div>

					<div className="flex items-center justify-end justify-self-end gap-1 sm:gap-2 min-w-0">
						<ThemeToggle className={showActions ? "hidden md:inline-flex" : undefined} />
						{showActions && (
							<>
							{/* Desktop / tablet actions */}
							<div className="hidden md:flex items-center gap-2 min-w-0 shrink-0">
								{!isMessages && (
									<Link
										href="/messages"
										className={navIconBtn}
										aria-label="Go to messages"
										title="Messages"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden
										>
											<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
										</svg>
									</Link>
								)}
								<Link
									href="/profile"
									className={navIconBtn}
									aria-label="Go to profile"
									title="Profile"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden
									>
										<path d="M20 21a8 8 0 0 0-16 0" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</Link>
								<button
									type="button"
									onClick={handleSignOut}
									className="rounded-full px-4 min-h-11 text-sm font-semibold border border-[var(--divider)] text-[var(--text-secondary)] hover-bg-surface"
									aria-label="Sign out"
								>
									Sign out
								</button>
							</div>

							{/* Mobile: messages + profile + menu */}
							<div className="flex md:hidden items-center gap-1 sm:gap-1.5 shrink-0">
								{!isMessages && (
									<Link
										href="/messages"
										className={navIconBtn}
										aria-label="Go to messages"
										title="Messages"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											aria-hidden
										>
											<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
										</svg>
									</Link>
								)}
								<Link
									href="/profile"
									className={navIconBtn}
									aria-label="Profile"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-hidden
									>
										<path d="M20 21a8 8 0 0 0-16 0" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</Link>
								<button
									type="button"
									onClick={() => setMenuOpen((o) => !o)}
									className="inline-flex items-center justify-center rounded-lg min-h-11 min-w-11 border border-[var(--divider)] text-[var(--text-primary)]"
									aria-label={menuOpen ? "Close menu" : "Open menu"}
									aria-expanded={menuOpen}
								>
									{menuOpen ? (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
											<path d="M6 6l12 12M18 6L6 18" />
										</svg>
									) : (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
											<path d="M4 7h16M4 12h16M4 17h16" />
										</svg>
									)}
								</button>
							</div>
							</>
						)}
					</div>
				</div>

				{showActions && menuOpen && (
					<nav
						className="md:hidden border-t border-[var(--divider)] py-3 flex flex-col gap-1"
						aria-label="Mobile navigation"
					>
						{!isMessages && (
							<Link
								href="/messages"
								className="flex items-center gap-3 rounded-lg px-3 min-h-11 text-sm font-medium text-[var(--text-primary)] hover-bg-surface"
							>
								Messages
							</Link>
						)}
						<Link
							href="/home"
							className="flex items-center gap-3 rounded-lg px-3 min-h-11 text-sm font-medium text-[var(--text-primary)] hover-bg-surface"
						>
							Home
						</Link>
						<Link
							href="/profile"
							className="flex items-center gap-3 rounded-lg px-3 min-h-11 text-sm font-medium text-[var(--text-primary)] hover-bg-surface"
						>
							Profile
						</Link>
						<ThemeToggle variant="menu" />
						<button
							type="button"
							onClick={handleSignOut}
							className="flex w-full items-center rounded-lg px-3 min-h-11 text-sm font-medium text-left text-[var(--text-secondary)] hover-bg-surface"
						>
							Sign out
						</button>
					</nav>
				)}
			</div>
		</header>
	);
}
