"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { API_URL, apiFetch } from "@/lib/api";

type UserLite = { id: string; email: string; name?: string };

export function ConversationSearch({ onSelectTarget }: { onSelectTarget: (target: { id: string; email: string; name?: string }) => void }) {
	const [q, setQ] = useState("");
	const [open, setOpen] = useState(false);
	const [results, setResults] = useState<UserLite[]>([]);
	const ref = useRef<HTMLDivElement | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const search = useCallback(async (query: string) => {
		const url = new URL(`${API_URL}/api/users/search`);
		url.searchParams.set("q", query);
		const res = await apiFetch(url.toString(), {
			headers: { "Content-Type": "application/json" },
		});
		if (!res.ok) throw new Error((await res.json()).error || "Search failed");
		return res.json() as Promise<UserLite[]>;
	}, []);

	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, []);

	useEffect(() => {
		if (timer.current) clearTimeout(timer.current);
		if (!q.trim()) {
			setResults([]);
			return;
		}
		timer.current = setTimeout(async () => {
			try {
				const data = await search(q.trim());
				setResults(data);
				setOpen(true);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("Search error:", err);
			}
		}, 300);
	}, [q, search]);

	return (
		<div ref={ref} className="relative p-3 sm:p-4 border-b border-[var(--divider)] shrink-0">
			<input
				value={q}
				onChange={(e) => setQ(e.target.value)}
				placeholder="Search by email..."
				className={cn(
					"w-full rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
					"border-[var(--divider)] focus:border-[var(--amber-border)]",
					"text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
				)}
			/>
			{open && (
				<div className="absolute left-3 right-3 top-[60px] z-10 rounded-lg border border-[var(--divider)] bg-[var(--bg-panel)] shadow-xl">
					{results.length === 0 ? (
						<div className="px-4 py-3 text-tertiary vx-body-sm">No se encontraron usuarios</div>
					) : (
						results.map((u) => (
							<button
								key={u.id}
								onClick={() => {
									onSelectTarget({ id: u.id, email: u.email, name: (u as any).name });
									setOpen(false);
									setQ("");
								}}
								className="w-full text-left px-4 py-3 min-h-11 hover:bg-white/5 border-b border-[var(--divider)] last:border-b-0"
							>
								<p className="vx-body text-primary">{u.email}</p>
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
