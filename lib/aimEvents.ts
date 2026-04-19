/** Dispatch after actions that may change AIM (posts, reactions, peer feedback). */
export function notifyAimRefresh(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event("vx-aim-refresh"));
}
