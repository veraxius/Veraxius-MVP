"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { getAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { ConversationSearch } from "@/components/ConversationSearch";
import { ChatWindow } from "@/components/ChatWindow";
import { useConversations } from "@/lib/useConversations";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type MessageTarget = {
	id: string;
	email: string;
	name?: string | null;
	profilePictureUrl?: string | null;
};

function MessagesPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const withUserId = searchParams.get("with");
	const { list } = useConversations();
	const openedFromQueryRef = useRef<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTarget, setSelectedTarget] = useState<MessageTarget | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [mobileView, setMobileView] = useState<"list" | "chat">("list");
	const isMdUp = useMediaQuery("(min-width: 768px)");
	const readingConversationId =
		selectedId && (isMdUp || mobileView === "chat") ? selectedId : null;

	useEffect(() => {
		const auth = getAuth();
		if (!auth) {
			router.replace("/login");
			return;
		}
	}, [router]);

	function openConversation(id: string) {
		setSelectedId(id);
		setSelectedTarget(null);
		setMobileView("chat");
	}

	function openTarget(target: MessageTarget) {
		setSelectedTarget(target);
		setSelectedId(null);
		setMobileView("chat");
	}

	useEffect(() => {
		const auth = getAuth();
		if (!auth || !withUserId || withUserId === auth.user?.id) return;
		if (openedFromQueryRef.current === withUserId) return;

		let cancelled = false;

		(async () => {
			try {
				const conversations = await list();
				if (cancelled) return;

				const existing = Array.isArray(conversations)
					? conversations.find((c: { id: string; participants?: { user?: { id?: string } }[] }) =>
							c.participants?.some((p) => p.user?.id === withUserId),
						)
					: null;

				if (existing?.id) {
					openedFromQueryRef.current = withUserId;
					openConversation(existing.id);
					return;
				}

				const resp = await fetch(`/api/users/${withUserId}/aim-summary`, { cache: "no-store" });
				const data = await resp.json();
				if (!resp.ok || cancelled) return;

				openedFromQueryRef.current = withUserId;
				openTarget({
					id: data.user.id,
					email: data.user.email,
					name: data.user.name,
					profilePictureUrl: data.user.profilePictureUrl,
				});
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("Open chat from profile error:", err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [withUserId, list]);

	return (
		<main
			className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-full min-w-0 overflow-hidden"
			style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
		>
			<div className="h-full w-full flex flex-col md:flex-row min-w-0">
				{/* Conversation list */}
				<div
					className={cn(
						"w-full md:w-80 lg:w-80 shrink-0 h-full min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--divider)]",
						mobileView === "chat" ? "hidden md:flex" : "flex",
					)}
				>
					<div className="p-3 sm:p-4 flex items-center justify-center border-b border-[var(--divider)] shrink-0">
						<h2 className="text-base sm:text-lg font-semibold text-center w-full">Chats</h2>
					</div>
					<ConversationSearch
						onSelectTarget={(target) => {
							openTarget(target);
						}}
					/>
					<div className="flex-1 min-h-0 overflow-y-auto">
						<ConversationList
							activeId={readingConversationId}
							onSelect={openConversation}
							refreshToken={refreshToken}
						/>
					</div>
				</div>

				{/* Chat panel */}
				<div
					className={cn(
						"flex-1 min-w-0 min-h-0 flex flex-col",
						mobileView === "list" ? "hidden md:flex" : "flex",
					)}
				>
					{mobileView === "chat" && (
						<div className="md:hidden shrink-0 px-4 py-2 border-b border-[var(--divider)]">
							<button
								type="button"
								onClick={() => setMobileView("list")}
								className="min-h-11 px-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							>
								← Back to chats
							</button>
						</div>
					)}
					<div className="flex-1 min-h-0 p-4 sm:p-6">
						{selectedId || selectedTarget ? (
							<ChatWindow
								conversationId={selectedId ?? undefined}
								targetUserId={selectedTarget?.id}
								targetEmail={selectedTarget?.email}
								targetName={selectedTarget?.name}
								targetProfilePictureUrl={selectedTarget?.profilePictureUrl}
								isReading={
									Boolean(
										selectedId &&
											readingConversationId &&
											selectedId === readingConversationId,
									)
								}
								onConversationCreated={(conv) => {
									setSelectedId(conv.id);
									setSelectedTarget(null);
									setRefreshToken((x) => x + 1);
									setMobileView("chat");
								}}
							/>
						) : (
							<div className="h-full flex items-center justify-center px-4">
								<p className="text-sm sm:text-base text-center text-[var(--text-tertiary)]">
									Select a chat to get started
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}

export default function MessagesPage() {
	return (
		<Suspense
			fallback={
				<main
					className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-full flex items-center justify-center"
					style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
				>
					<p className="text-sm text-[var(--text-tertiary)]">Loading messages…</p>
				</main>
			}
		>
			<MessagesPageContent />
		</Suspense>
	);
}
