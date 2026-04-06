"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConversations } from "@/lib/useConversations";
import { useSocket } from "@/lib/useSocket";
import { cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";

type Message = {
	id: string;
	conversationId: string;
	senderId: string;
	content: string;
	created_at: string;
};

export function ChatWindow({ conversationId, targetUserId, onConversationCreated }: { conversationId?: string; targetUserId?: string; onConversationCreated?: (conv: { id: string }) => void }) {
	const { history, createConversation, list } = useConversations();
	const socket = useSocket();
	const [messages, setMessages] = useState<Message[]>([]);
	const [typing, setTyping] = useState<boolean>(false);
	const [input, setInput] = useState("");
	const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const convIdRef = useRef<string | undefined>(conversationId);
	const [peerEmail, setPeerEmail] = useState<string | null>(null);
	const [meId, setMeId] = useState<string | null>(null);

	// Load history
	useEffect(() => {
		let mounted = true;
		convIdRef.current = conversationId;
		// cache current user id
		const auth = getAuth();
		setMeId(auth?.user?.id ?? null);
		if (!conversationId) {
			setMessages([]);
			setPeerEmail(null);
			return () => { mounted = false; };
		}
		(async () => {
			try {
				const data = await history(conversationId);
				if (mounted) setMessages(data);
				socket.markRead(conversationId);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("Load history error:", err);
			}
		})();
		// Load peer email from conversations list
		(async () => {
			try {
				const auth = getAuth();
				const me = auth?.user?.id;
				const listData = await list();
				const conv = Array.isArray(listData) ? listData.find((c: any) => c.id === conversationId) : null;
				if (conv && me) {
					const other = (conv.participants || []).map((p: any) => p.user).find((u: any) => u?.id !== me);
					setPeerEmail(other?.email ?? null);
				} else {
					setPeerEmail(null);
				}
			} catch {
				setPeerEmail(null);
			}
		})();
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	// Subscribe socket events
	useEffect(() => {
		const offNew = socket.onNewMessage((msg) => {
			if (msg.conversationId === convIdRef.current) {
				setMessages((prev) => [...prev, msg as Message]);
			}
		});
		const offTyping = socket.onTyping((d) => {
			if (d.conversationId === convIdRef.current) setTyping(true);
		});
		const offStop = socket.onStopTyping((d) => {
			if (d.conversationId === convIdRef.current) setTyping(false);
		});
		const offRead = socket.onMessagesRead((_d) => {
			// hook for read receipts if needed
		});
		return () => {
			offNew?.();
			offTyping?.();
			offStop?.();
			offRead?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	const handleSend = async () => {
		const content = input.trim();
		if (!content) return;
		// Ensure conversation exists; if not, create on first send
		if (!convIdRef.current && targetUserId) {
			try {
				const conv = await createConversation(targetUserId);
				convIdRef.current = conv.id;
				onConversationCreated?.(conv);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("Create-on-send error:", err);
				return;
			}
		}
		if (!convIdRef.current) return;
		socket.sendMessage(convIdRef.current, content);
		setInput("");
		socket.stopTyping(convIdRef.current);
	};

	const handleTyping = (value: string) => {
		setInput(value);
		if (convIdRef.current) socket.startTyping(convIdRef.current);
		if (typingTimeout.current) clearTimeout(typingTimeout.current);
		typingTimeout.current = setTimeout(() => {
			if (convIdRef.current) socket.stopTyping(convIdRef.current);
		}, 1200);
	};

	return (
		<div className="flex h-full flex-col rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)]">
			{/* Top navbar inside chat with peer email */}
			<div className="h-12 px-4 border-b border-[var(--divider)] flex items-center justify-between">
				<div className="vx-mono text-sm text-[var(--text-secondary)] truncate">
					{peerEmail ?? "—"}
				</div>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{messages.map((m) => (
					<div
						key={m.id}
						className={cn("w-full flex", m.senderId === meId ? "justify-end" : "justify-start")}
					>
						<div
							className={cn(
								"inline-block max-w-[70%] rounded-lg px-3 py-2",
								m.senderId === meId
									? "bg-[var(--amber)] text-[var(--bg-primary)]"
									: "border border-[var(--divider)] text-[var(--text-primary)]"
							)}
						>
							<p className="vx-body-sm">{m.content}</p>
							<p
								className={cn(
									"vx-mono-sm mt-1",
									m.senderId === meId ? "text-[rgba(0,0,0,0.55)]" : "text-tertiary"
								)}
							>
								{new Date(m.created_at).toLocaleString()}
							</p>
						</div>
					</div>
				))}
				{typing && (
					<p className="vx-body-sm text-tertiary">typing...</p>
				)}
			</div>
			<div className="border-t border-[var(--divider)] p-3 flex gap-2">
				<input
					value={input}
					onChange={(e) => handleTyping(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSend();
					}}
					placeholder="Type a message..."
					className={cn(
						"flex-1 rounded-lg border bg-transparent px-4 py-3 outline-none",
						"border-[var(--divider)] focus:border-[var(--amber-border)]",
						"text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
					)}
				/>
				<button
					onClick={handleSend}
					className="vx-btn-primary rounded-lg px-5"
				>
					Send
				</button>
			</div>
		</div>
	);
}
