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
			<div className="max-w-3xl mx-auto p-6 text-[var(--text-secondary)]">Cargando…</div>
		</AuthGuard>
	);
}
