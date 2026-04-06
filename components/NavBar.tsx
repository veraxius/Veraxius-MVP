"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function NavBar() {
	const pathname = usePathname();
	if (pathname === "/login" || pathname === "/register") return null;

	const isHome = pathname === "/home" || pathname === "/";

	return (
		<header
			className="w-full"
			style={{ backgroundColor: "var(--bg-panel)", borderBottom: "0.1px solid var(--amber)" }}
		>
			<div className="w-full pl-2 pr-2 sm:pl-4 sm:pr-4">
				<div className="h-14 flex items-center">
					<div className="flex items-center">
						<Link href="/home" aria-label="Veraxius Home" className="inline-flex items-center">
							<Image
								src="/Veraxius Logo FINAL FINAL 2 Horizontal Version-02.png"
								alt="Veraxius"
								width={140}
								height={28}
								className="h-7 w-auto"
								priority
							/>
						</Link>
					</div>
					<div className="flex items-center gap-2 ml-auto mr-0">
						{isHome ? (
							<>
								<Link
									href="/messages"
									className="inline-flex items-center gap-2 rounded-full px-4 py-2 vx-btn-primary !bg-[var(--amber)] !text-[var(--bg-primary)]"
									aria-label="Go to messages"
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
										className="inline-block"
									>
										<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
									</svg>
									<span className="text-sm font-semibold">Messages</span>
								</Link>
								<Link
									href="/profile"
									className="inline-flex items-center justify-center rounded-full w-10 h-10 vx-btn-primary !bg-[var(--amber)] !text-[var(--bg-primary)] px-0 py-0"
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
										className="inline-block"
									>
										<path d="M20 21a8 8 0 0 0-16 0" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</Link>
							</>
						) : null}
					</div>
				</div>
			</div>
		</header>
	);
}
