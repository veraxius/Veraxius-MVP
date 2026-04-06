"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversations } from "@/lib/useConversations";
import { useSocket } from "@/lib/useSocket";
import { cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";

type Conversation = {
	id: string;
	participants: { user: { id: string; email: string } }[];
	messages?: { content: string; created_at: string }[];
	created_at: string;
};

export function ConversationList({
	activeId,
	onSelect,
	refreshToken
}: {
	activeId: string | null;
	onSelect: (id: string) => void;
	refreshToken?: number;
}) {
	const { list } = useConversations();
	const socket = useSocket();
	const [items, setItems] = useState<Conversation[]>([]);
	const userId = useMemo(() => {
		const auth = getAuth();
		try {
			const payload = auth?.token ? JSON.parse(atob(auth.token.split(".")[1])) : null;
			return payload?.sub as string | undefined;
		} catch {
			return undefined;
		}
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const data = await list();
				setItems(data);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error("Load conversations error", e);
			}
		})();
	}, [list, refreshToken]);

	useEffect(() => {
		const off = socket.onNewMessage((msg) => {
			setItems((prev) => {
				const copy = [...prev];
				const idx = copy.findIndex((c) => c.id === msg.conversationId);
				if (idx === -1) {
					// Do not create new conversations on message push; ignore if unknown
					return prev;
				}
				if (idx >= 0) {
					// update last message preview
					copy[idx] = {
						...copy[idx],
						messages: [{ content: msg.content, created_at: msg.created_at }]
					};
					// move to top
					const [item] = copy.splice(idx, 1);
					copy.unshift(item);
				}
				return copy;
			});
		});
		return () => { off?.(); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="flex-1 overflow-y-auto">
			{items.map((c) => {
				const other = c.participants.find((p) => p.user.id !== userId)?.user;
				const last = c.messages?.[0];
				const preview = last?.content ? (last.content.length > 40 ? last.content.slice(0, 40) + "…" : last.content) : "";
				const time = last?.created_at ? new Date(last.created_at).toLocaleTimeString() : "";
				return (
					<button
						key={c.id}
						onClick={() => onSelect(c.id)}
						className={cn(
							"w-full text-left px-4 py-3 border-b border-[var(--divider)] hover:bg-white/5",
							activeId === c.id ? "bg-white/10" : ""
						)}
					>
						<div className="flex items-center justify-between">
							<p className="vx-body text-primary">{other?.email || "Unknown"}</p>
							<span className="vx-mono-sm text-tertiary">{time}</span>
						</div>
						<p className="vx-body-sm text-tertiary mt-1">{preview}</p>
					</button>
				);
			})}
		</div>
	);
}
