"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversations } from "@/lib/useConversations";
import { useSocket } from "@/lib/useSocket";
import { cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";

import { UserAvatar } from "@/components/UserAvatar";

type Conversation = {
	id: string;
	participants: { user: { id: string; email: string; name?: string | null; profilePictureUrl?: string | null } }[];
	messages?: { content: string; created_at: string; senderId?: string }[];
	created_at: string;
	unreadCount?: number;
};

function sortConversations(items: Conversation[]): Conversation[] {
	return [...items].sort((a, b) => {
		const aTime = a.messages?.[0]?.created_at ?? a.created_at;
		const bTime = b.messages?.[0]?.created_at ?? b.created_at;
		return new Date(bTime).getTime() - new Date(aTime).getTime();
	});
}

function normalizeConversations(data: unknown): Conversation[] {
	if (!Array.isArray(data)) return [];
	return data.map((c) => ({
		...(c as Conversation),
		unreadCount: Math.max(0, Number((c as Conversation).unreadCount) || 0),
	}));
}

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
	const activeIdRef = useRef(activeId);
	const userIdRef = useRef<string | null>(getAuth()?.user?.id ?? null);

	const reloadList = useCallback(async () => {
		try {
			const data = await list();
			setItems((prev) => {
				const normalized = sortConversations(normalizeConversations(data));
				if (!activeIdRef.current) return normalized;
				return normalized.map((c) =>
					c.id === activeIdRef.current ? { ...c, unreadCount: 0 } : c,
				);
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error("Load conversations error", e);
		}
	}, [list]);

	useEffect(() => {
		activeIdRef.current = activeId;
	}, [activeId]);

	useEffect(() => {
		userIdRef.current = getAuth()?.user?.id ?? null;
	}, [refreshToken]);

	useEffect(() => {
		if (!activeId) return;
		setItems((prev) =>
			prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
		);
	}, [activeId]);

	useEffect(() => {
		void reloadList();
	}, [reloadList, refreshToken]);

	useEffect(() => {
		const interval = setInterval(() => {
			void reloadList();
		}, 12_000);
		return () => clearInterval(interval);
	}, [reloadList]);

	const handleNewMessage = useCallback((msg: {
		id: string;
		conversationId: string;
		senderId: string;
		content: string;
		created_at: string;
	}) => {
		const userId = userIdRef.current;
		setItems((prev) => {
			const copy = [...prev];
			const idx = copy.findIndex((c) => c.id === msg.conversationId);
			if (idx === -1) {
				void reloadList();
				return prev;
			}

			const isFromOther = Boolean(userId && msg.senderId !== userId);
			const isActive = msg.conversationId === activeIdRef.current;
			const prevUnread = copy[idx].unreadCount ?? 0;

			copy[idx] = {
				...copy[idx],
				messages: [{ content: msg.content, created_at: msg.created_at, senderId: msg.senderId }],
				unreadCount: isFromOther && !isActive ? prevUnread + 1 : isActive ? 0 : prevUnread,
			};

			const [item] = copy.splice(idx, 1);
			return sortConversations([item, ...copy]);
		});
	}, [reloadList]);

	const handleMessagesRead = useCallback(({
		conversationId,
		userId: readerId,
	}: {
		conversationId: string;
		userId: string;
	}) => {
		if (readerId !== userIdRef.current) return;
		setItems((prev) =>
			prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
		);
	}, []);

	useEffect(() => {
		const attach = () => {
			const offNew = socket.onNewMessage(handleNewMessage);
			const offRead = socket.onMessagesRead(handleMessagesRead);
			return () => {
				offNew?.();
				offRead?.();
			};
		};

		let detach = attach();
		const offConnect = socket.onConnect(() => {
			detach?.();
			detach = attach();
			void reloadList();
		});

		return () => {
			offConnect?.();
			detach?.();
		};
	}, [socket, handleNewMessage, handleMessagesRead, reloadList]);

	return (
		<div className="flex-1 overflow-y-auto">
			{items.map((c) => {
				const userId = userIdRef.current;
				const other = c.participants.find((p) => p.user.id !== userId)?.user;
				const last = c.messages?.[0];
				const preview = last?.content ? (last.content.length > 40 ? last.content.slice(0, 40) + "…" : last.content) : "";
				const time = last?.created_at ? new Date(last.created_at).toLocaleTimeString() : "";
				const unreadCount = c.unreadCount ?? 0;

				return (
					<button
						key={c.id}
						onClick={() => onSelect(c.id)}
						className={cn(
							"w-full text-left px-4 py-3 min-h-11 border-b border-[var(--divider)] hover-bg-surface",
							activeId === c.id ? "bg-surface-active" : ""
						)}
					>
						<div className="flex items-start gap-3 min-w-0">
							<UserAvatar
								userId={other?.id ?? "unknown"}
								name={other?.name}
								email={other?.email}
								profilePictureUrl={other?.profilePictureUrl}
								size="sm"
							/>
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between gap-2 min-w-0">
									<p className="vx-body text-primary truncate min-w-0">
										{other?.name || other?.email || "Unknown"}
									</p>
									<span className="vx-mono-sm text-tertiary shrink-0 leading-tight">
										{time}
									</span>
								</div>
								<div className="flex items-center justify-between gap-2 mt-1 min-w-0">
									<p className="vx-body-sm text-tertiary truncate min-w-0 flex-1">
										{preview}
									</p>
									{unreadCount > 0 ? (
										<span
											className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none shrink-0 tabular-nums"
											style={{
												backgroundColor: "var(--amber)",
												color: "var(--text-on-amber)",
											}}
											aria-label={`${unreadCount} unread messages`}
										>
											{unreadCount}
										</span>
									) : null}
								</div>
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
