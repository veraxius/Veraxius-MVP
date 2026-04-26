"use client";

import { useEffect } from "react";
import { syncSessionCookieFromStorage } from "@/lib/auth";

/**
 * Restores session cookie when a valid local session exists (e.g. after deploy or before saveAuth set the flag).
 */
export function SessionSync() {
	useEffect(() => {
		syncSessionCookieFromStorage();
	}, []);

	return null;
}
