"use client";

import { useEffect } from "react";
import { syncSessionCookieFromStorage } from "@/lib/auth";

/**
 * Restores session cookie when a valid local session exists (e.g. after deploy or before saveAuth set the flag).
 */
export function SessionSync() {
	useEffect(() => {
		syncSessionCookieFromStorage();

		// If the browser restores this page from bfcache (e.g. pressing "back"
		// after signing out), the in-memory React state — including whatever
		// was on screen while still logged in — comes back as-is instead of
		// re-running. Force a full reload so the page re-checks the real
		// session state (which by then reflects the sign-out) instead of
		// showing a frozen snapshot of the signed-in view.
		function handlePageShow(event: PageTransitionEvent) {
			if (event.persisted) {
				window.location.reload();
			}
		}
		window.addEventListener("pageshow", handlePageShow);
		return () => window.removeEventListener("pageshow", handlePageShow);
	}, []);

	return null;
}
