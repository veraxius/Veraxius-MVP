"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default function ProfileIndexPage() {
	const router = useRouter();
	const [checking, setChecking] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const auth = getAuth();
			if (auth?.user?.id) {
				router.replace(`/profile/${auth.user.id}`);
			} else {
				setError("No has iniciado sesión.");
			}
		} finally {
			setChecking(false);
		}
	}, [router]);

	if (checking) return <div className="max-w-3xl mx-auto p-6">Cargando…</div>;

	if (error) {
		return (
			<div className="max-w-3xl mx-auto p-6 space-y-4">
				<h1 className="text-2xl font-semibold">Perfil</h1>
				<p className="text-gray-700">{error}</p>
				<a href="/login" className="text-blue-600 underline">Ir a iniciar sesión</a>
			</div>
		);
	}

	return null;
}
