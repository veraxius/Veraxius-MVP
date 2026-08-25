"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConversations } from "@/lib/useConversations";
import { useSocket } from "@/lib/useSocket";
import { cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { API_URL, apiFetch } from "@/lib/api";
import { validatePostImageFile } from "@/lib/postImage";
import { UserAvatar } from "@/components/UserAvatar";
import { ImageLightbox } from "@/components/ImageLightbox";

type Message = {
	id: string;
	conversationId: string;
	senderId: string;
	content: string;
	imageUrl?: string | null;
	created_at: string;
};

function isOptimisticMessageId(id: string) {
	return id.startsWith("optimistic-");
}

function mergeMessageLists(prev: Message[], loaded: Message[], convId: string): Message[] {
	const map = new Map<string, Message>();
	for (const m of loaded) map.set(m.id, m);
	for (const m of prev) {
		if (map.has(m.id)) continue;
		if (
			m.conversationId === convId ||
			m.conversationId === "pending" ||
			isOptimisticMessageId(m.id)
		) {
			map.set(m.id, m);
		}
	}
	return Array.from(map.values()).sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
	);
}

export function ChatWindow({ conversationId, targetUserId, targetEmail, targetName, targetProfilePictureUrl, isReading = true, onConversationCreated }: { conversationId?: string; targetUserId?: string; targetEmail?: string; targetName?: string | null; targetProfilePictureUrl?: string | null; isReading?: boolean; onConversationCreated?: (conv: { id: string }) => void }) {
	const { history, createConversation, list } = useConversations();
	const socket = useSocket();
	const [messages, setMessages] = useState<Message[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [typing, setTyping] = useState<boolean>(false);
	const [input, setInput] = useState("");
	const [composeImage, setComposeImage] = useState<File | null>(null);
	const [composeImagePreview, setComposeImagePreview] = useState<string | null>(null);
	const [composeImageError, setComposeImageError] = useState<string | null>(null);
	const [sendingImage, setSendingImage] = useState(false);
	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
	const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const convIdRef = useRef<string | undefined>(undefined);
	const meIdRef = useRef<string | null>(null);
	const pendingSendsRef = useRef<string[]>([]);
	const preserveMessagesOnLoadRef = useRef(false);
	const isReadingRef = useRef(isReading);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const [peerEmail, setPeerEmail] = useState<string | null>(targetEmail ?? null);
	const [peerName, setPeerName] = useState<string | null>(null);
	const [peerId, setPeerId] = useState<string | null>(targetUserId ?? null);
	const [peerProfilePictureUrl, setPeerProfilePictureUrl] = useState<string | null>(targetProfilePictureUrl ?? null);
	const [meId, setMeId] = useState<string | null>(null);

	useEffect(() => {
		meIdRef.current = meId;
	}, [meId]);

	useEffect(() => {
		isReadingRef.current = isReading;
	}, [isReading]);

	useEffect(() => {
		if (!isReading || !conversationId) return;
		socket.markRead(conversationId);
	}, [isReading, conversationId, socket]);

	function removeOptimisticMessage(optimisticId: string) {
		setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
		pendingSendsRef.current = pendingSendsRef.current.filter((id) => id !== optimisticId);
	}

	function applyIncomingMessage(prev: Message[], msg: Message): Message[] {
		if (prev.some((m) => m.id === msg.id)) return prev;

		const myId = meIdRef.current;
		if (myId && msg.senderId === myId) {
			const pendingId = pendingSendsRef.current.shift();
			if (pendingId) {
				const pendingIdx = prev.findIndex((m) => m.id === pendingId);
				if (pendingIdx >= 0) {
					const next = [...prev];
					next[pendingIdx] = msg;
					return next;
				}
			}

			const optimisticIdx = prev.findIndex(
				(m) => isOptimisticMessageId(m.id) && m.senderId === myId && m.content === msg.content,
			);
			if (optimisticIdx >= 0) {
				const optimisticId = prev[optimisticIdx].id;
				pendingSendsRef.current = pendingSendsRef.current.filter((id) => id !== optimisticId);
				const next = [...prev];
				next[optimisticIdx] = msg;
				return next;
			}

			// Duplicate socket echo for a message we already show.
			return prev;
		}

		return [...prev, msg];
	}

	const loadHistory = useCallback(
		async (convId: string, mode: "replace" | "merge" = "merge") => {
			if (mode === "replace") setLoadingHistory(true);
			try {
				const data = await history(convId);
				if (convIdRef.current !== convId) return;

				const loaded = Array.isArray(data) ? (data as Message[]) : [];
				setMessages((prev) =>
					mode === "replace" ? loaded : mergeMessageLists(prev, loaded, convId),
				);
				if (isReadingRef.current) socket.markRead(convId);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("Load history error:", err);
			} finally {
				if (convIdRef.current === convId) setLoadingHistory(false);
			}
		},
		[history, socket],
	);

	// Load history when conversation changes
	useEffect(() => {
		convIdRef.current = conversationId;
		const auth = getAuth();
		const userId = auth?.user?.id ?? null;
		setMeId(userId);
		meIdRef.current = userId;

		if (!conversationId) {
			setMessages([]);
			setLoadingHistory(false);
			return;
		}

		const preserveLocalMessages = preserveMessagesOnLoadRef.current;
		preserveMessagesOnLoadRef.current = false;

		if (preserveLocalMessages) {
			setMessages((prev) =>
				prev.map((m) =>
					m.conversationId === "pending" ? { ...m, conversationId } : m,
				),
			);
			void loadHistory(conversationId, "merge");
		} else {
			pendingSendsRef.current = [];
			setMessages([]);
			void loadHistory(conversationId, "replace");
		}

		socket.joinConversations();
	}, [conversationId, loadHistory, socket]);

	// Load peer profile for header
	useEffect(() => {
		if (!conversationId) {
			setPeerEmail(targetEmail ?? null);
			setPeerName(targetName ?? (targetEmail ? String(targetEmail).split("@")[0] : null));
			setPeerId(targetUserId ?? null);
			setPeerProfilePictureUrl(targetProfilePictureUrl ?? null);
			return;
		}

		(async () => {
			try {
				const auth = getAuth();
				const me = auth?.user?.id;
				const listData = await list();
				const conv = Array.isArray(listData) ? listData.find((c: any) => c.id === conversationId) : null;
				if (conv && me) {
					const other = (conv.participants || []).map((p: any) => p.user).find((u: any) => u?.id !== me) || null;
					setPeerId(other?.id ?? null);
					setPeerProfilePictureUrl(other?.profilePictureUrl ?? null);
					setPeerEmail(other?.email ?? targetEmail ?? null);
					const fallbackName = other?.email ? String(other.email).split("@")[0] : undefined;
					setPeerName(other?.name ?? fallbackName ?? targetName ?? null);
				} else {
					setPeerEmail(targetEmail ?? null);
					setPeerName(targetName ?? (targetEmail ? String(targetEmail).split("@")[0] : null));
					setPeerProfilePictureUrl(targetProfilePictureUrl ?? null);
				}
			} catch {
				setPeerEmail(targetEmail ?? null);
				setPeerName(targetName ?? (targetEmail ? String(targetEmail).split("@")[0] : null));
				setPeerProfilePictureUrl(targetProfilePictureUrl ?? null);
			}
		})();
	}, [conversationId, list, targetEmail, targetName, targetProfilePictureUrl, targetUserId]);

	// Subscribe socket events
	useEffect(() => {
		const attach = () => {
			const offNew = socket.onNewMessage((msg) => {
				if (msg.conversationId !== convIdRef.current) return;
				setMessages((prev) => applyIncomingMessage(prev, msg as Message));
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
		};

		let detach = attach();
		const offConnect = socket.onConnect(() => {
			socket.joinConversations();
			detach?.();
			detach = attach();
			if (convIdRef.current) {
				void loadHistory(convIdRef.current);
			}
		});

		return () => {
			offConnect?.();
			detach?.();
		};
	}, [conversationId, loadHistory, socket]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	async function ensureConversationId(): Promise<string | null> {
		let convId = convIdRef.current;
		if (!convId && targetUserId) {
			const conv = await createConversation(targetUserId);
			convId = conv.id;
			convIdRef.current = convId;
			preserveMessagesOnLoadRef.current = true;
			socket.joinConversations();
			const auth = getAuth();
			const me = auth?.user?.id;
			const other = (conv.participants || [])
				.map((p: { user?: { id?: string; email?: string; name?: string | null; profilePictureUrl?: string | null } }) => p.user)
				.find((u: { id?: string } | undefined) => u?.id !== me) || null;
			if (other?.id) setPeerId(other.id);
			setPeerProfilePictureUrl(other?.profilePictureUrl ?? null);
			if (other?.email) setPeerEmail(other.email);
			if (other?.name) setPeerName(other.name);
			onConversationCreated?.(conv);
		}
		return convId ?? null;
	}

	function handleComposeImageChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		const validationError = validatePostImageFile(file);
		if (validationError) {
			setComposeImageError(validationError);
			return;
		}

		setComposeImageError(null);
		if (composeImagePreview) URL.revokeObjectURL(composeImagePreview);
		setComposeImage(file);
		setComposeImagePreview(URL.createObjectURL(file));
	}

	function clearComposeImage() {
		if (composeImagePreview) URL.revokeObjectURL(composeImagePreview);
		setComposeImage(null);
		setComposeImagePreview(null);
		setComposeImageError(null);
	}

	const handleSendImage = () => {
		if (!composeImage || sendingImage) return;

		const senderId = meIdRef.current ?? getAuth()?.user?.id;
		if (!senderId) return;

		const content = input.trim();
		const optimisticId = `optimistic-${crypto.randomUUID()}`;
		const optimisticMsg: Message = {
			id: optimisticId,
			conversationId: convIdRef.current ?? "pending",
			senderId,
			content,
			imageUrl: composeImagePreview,
			created_at: new Date().toISOString(),
		};

		const file = composeImage;
		pendingSendsRef.current.push(optimisticId);
		setMessages((prev) => [...prev, optimisticMsg]);
		setInput("");
		setComposeImage(null);
		setComposeImagePreview(null);
		setSendingImage(true);
		if (convIdRef.current) socket.stopTyping(convIdRef.current);

		void (async () => {
			try {
				const convId = await ensureConversationId();
				if (!convId) {
					removeOptimisticMessage(optimisticId);
					return;
				}

				const formData = new FormData();
				formData.append("content", content);
				formData.append("image", file);

				const resp = await apiFetch(`${API_URL}/api/conversations/${convId}/messages/image`, {
					method: "POST",
					body: formData,
				});
				if (!resp.ok) {
					removeOptimisticMessage(optimisticId);
				}
				// On success, the server emits "new_message" over the socket, which
				// reconciles the optimistic entry via pendingSendsRef — same as text.
			} catch (err) {
				removeOptimisticMessage(optimisticId);
				// eslint-disable-next-line no-console
				console.error("Send image error:", err);
			} finally {
				setSendingImage(false);
			}
		})();
	};

	const handleSend = () => {
		if (composeImage) {
			handleSendImage();
			return;
		}

		const content = input.trim();
		if (!content) return;

		const senderId = meIdRef.current ?? getAuth()?.user?.id;
		if (!senderId) return;

		const optimisticId = `optimistic-${crypto.randomUUID()}`;
		const optimisticMsg: Message = {
			id: optimisticId,
			conversationId: convIdRef.current ?? "pending",
			senderId,
			content,
			created_at: new Date().toISOString(),
		};

		pendingSendsRef.current.push(optimisticId);
		setMessages((prev) => [...prev, optimisticMsg]);
		setInput("");
		if (convIdRef.current) socket.stopTyping(convIdRef.current);

		void (async () => {
			try {
				const convId = await ensureConversationId();
				if (!convId) {
					removeOptimisticMessage(optimisticId);
					return;
				}

				socket.sendMessage(convId, content);
			} catch (err) {
				removeOptimisticMessage(optimisticId);
				// eslint-disable-next-line no-console
				console.error("Send message error:", err);
			}
		})();
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
		<div className="flex h-full min-w-0 flex-col rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] overflow-hidden">
			{/* Top navbar inside chat with peer identity */}
			<div className="min-h-12 px-4 py-2 border-b border-[var(--divider)] flex items-center justify-between shrink-0">
				{peerId ? (
					<Link
						href={`/profile/${peerId}`}
						className="flex items-center gap-2 min-w-0 rounded-lg p-1 -m-1 transition-colors hover-bg-surface"
						title="View profile"
					>
						<UserAvatar
							userId={peerId}
							name={peerName}
							email={peerEmail}
							profilePictureUrl={peerProfilePictureUrl}
							size="sm"
						/>
						<div className="min-w-0">
							<p className="vx-body text-[var(--text-primary)] truncate hover:underline">
								{peerName ?? "—"}
							</p>
							<p className="vx-mono-sm text-[var(--text-tertiary)] truncate">{peerEmail ?? ""}</p>
						</div>
					</Link>
				) : (
					<div className="flex items-center gap-2 min-w-0">
						<UserAvatar
							userId="peer"
							name={peerName}
							email={peerEmail}
							profilePictureUrl={peerProfilePictureUrl}
							size="sm"
						/>
						<div className="min-w-0">
							<p className="vx-body text-[var(--text-primary)] truncate">{peerName ?? "—"}</p>
							<p className="vx-mono-sm text-[var(--text-tertiary)] truncate">{peerEmail ?? ""}</p>
						</div>
					</div>
				)}
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{loadingHistory && messages.length === 0 ? (
					<p className="vx-body-sm text-tertiary text-center py-8">Loading messages…</p>
				) : null}
				{messages.map((m) => (
					<div
						key={m.id}
						className={cn("w-full flex", m.senderId === meId ? "justify-end" : "justify-start")}
					>
						<div
							className={cn(
								"inline-block max-w-[min(85%,20rem)] sm:max-w-[70%] rounded-lg px-3 py-2 break-words",
								m.senderId === meId
									? "bg-[var(--amber)] text-[var(--text-on-amber)]"
									: "border border-[var(--divider)] text-[var(--text-primary)]"
							)}
						>
							{m.content && (
								<p
									className={cn(
										"vx-body-sm",
										m.senderId === meId ? "!text-[var(--text-on-amber)]" : "!text-[var(--text-primary)]"
									)}
								>
									{m.content}
								</p>
							)}
							{m.imageUrl && (
								<button
									type="button"
									onClick={() => setLightboxSrc(m.imageUrl as string)}
									className={cn("block w-full cursor-pointer", m.content ? "mt-2" : "mt-1")}
								>
									<img
										src={m.imageUrl}
										alt=""
										className="max-h-64 w-full rounded-md object-cover"
										loading="lazy"
									/>
								</button>
							)}
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
				<div ref={messagesEndRef} aria-hidden />
			</div>
			<div className="border-t border-[var(--divider)] p-3 shrink-0 min-w-0 space-y-2">
				{(composeImagePreview || composeImageError) && (
					<div className="flex items-center gap-3">
						{composeImagePreview && (
							<div className="relative rounded-lg border border-[var(--divider)] bg-[var(--surface-subtle)] p-1">
								<img
									src={composeImagePreview}
									alt=""
									className="h-9 w-9 rounded-md object-cover"
								/>
								<button
									type="button"
									onClick={clearComposeImage}
									aria-label="Remove image"
									className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--bg-panel)] text-[var(--text-secondary)] shadow-sm"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="10"
										height="10"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										aria-hidden
									>
										<path d="M6 6l12 12M18 6L6 18" />
									</svg>
								</button>
							</div>
						)}
						{composeImageError && (
							<span className="text-xs text-red">{composeImageError}</span>
						)}
					</div>
				)}

				<div className="flex gap-2">
					<label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--divider)] bg-transparent px-3 text-secondary shrink-0">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden
						>
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
						<input
							type="file"
							accept={["image/jpeg", "image/png", "image/webp"].join(",")}
							className="sr-only"
							onChange={handleComposeImageChange}
						/>
					</label>

					<input
						value={input}
						onChange={(e) => handleTyping(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSend();
						}}
						placeholder="Type a message..."
						className={cn(
							"flex-1 min-w-0 rounded-lg border bg-transparent px-4 py-3 min-h-11 text-base sm:text-sm outline-none",
							"border-[var(--divider)] focus:border-[var(--amber-border)]",
							"text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
						)}
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={sendingImage}
						className={cn(
							"vx-btn-primary rounded-lg px-5 min-h-11 shrink-0 text-sm font-semibold",
							sendingImage && "opacity-70",
						)}
					>
						Send
					</button>
				</div>
			</div>

			{lightboxSrc && (
				<ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
			)}
		</div>
	);
}
