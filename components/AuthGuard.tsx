"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";

/**
 * Client-side guard for JWT in localStorage (matches current auth implementation).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [allowed, setAllowed] = useState<boolean | null>(null);

	useEffect(() => {
		setAllowed(!!getAuth()?.token);
	}, []);

	useEffect(() => {
		if (allowed === false) {
			router.replace("/login");
		}
	}, [allowed, router]);

	if (allowed === null) {
		return (
			<div className="min-h-[40vh] flex items-center justify-center px-6 text-[var(--text-secondary)]">
				Loading…
			</div>
		);
	}

	if (!allowed) {
		return (
			<div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-6">
				<p className="text-[var(--text-secondary)]">Redirecting to sign in…</p>
				<Link href="/login" className="text-amber underline">
					Go to login
				</Link>
			</div>
		);
	}

	return <>{children}</>;
}
