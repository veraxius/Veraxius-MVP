"use client";

import { useEffect, useState } from "react";
import { getAuth, type AuthUser } from "@/lib/auth";

export function useCurrentUser() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const a = getAuth();
		setUser(a?.user ?? null);
		setReady(true);
	}, []);

	return { user, isAuthenticated: !!user, ready };
}
