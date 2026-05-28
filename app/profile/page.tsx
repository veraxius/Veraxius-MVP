"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { getAuth } from "@/lib/auth";

export default function ProfileIndexPage() {
	const router = useRouter();

	useEffect(() => {
		const id = getAuth()?.user?.id;
		if (id) router.replace(`/profile/${id}`);
	}, [router]);

	return (
		<AuthGuard>
			<div className="w-full max-w-3xl mx-auto min-w-0 px-4 py-6 sm:px-6 lg:px-8 text-sm sm:text-base text-[var(--text-secondary)]">
				Loading…
			</div>
		</AuthGuard>
	);
}
