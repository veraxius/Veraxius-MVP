"use client";

import { useEffect, useState } from "react";
import { getAuth, clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { ConversationSearch } from "@/components/ConversationSearch";
import { ChatWindow } from "@/components/ChatWindow";

export default function DashboardPage() {
	const router = useRouter();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);

	useEffect(() => {
		const auth = getAuth();
		if (!auth) {
			router.replace("/login");
			return;
		}
	}, [router]);

	return (
		<main
			className="h-screen w-full"
			style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
		>
			<div className="h-full w-full mx-auto max-w-vx-content flex">
				{/* Left column: sidebar */}
				<div className="w-[320px] h-full border-r border-[var(--divider)] flex flex-col">
					<div className="p-3 flex items-center justify-between border-b border-[var(--divider)]">
						<h2 className="vx-h4">Chats</h2>
						<button
							className="vx-btn-secondary rounded-lg px-3 py-2"
							onClick={() => {
								clearAuth();
								router.replace("/login");
							}}
						>
							Log out
						</button>
					</div>
					<ConversationSearch
						onSelectTarget={(targetId) => {
							setSelectedTargetUserId(targetId);
							setSelectedId(null);
						}}
					/>
					<ConversationList
						activeId={selectedId}
						onSelect={(id) => setSelectedId(id)}
						refreshToken={refreshToken}
					/>
				</div>

				{/* Right column: chat */}
				<div className="flex-1 h-full p-6">
					{selectedId ? (
						<ChatWindow conversationId={selectedId} />
					) : selectedTargetUserId ? (
						<ChatWindow
							targetUserId={selectedTargetUserId}
							onConversationCreated={(conv) => {
								setSelectedId(conv.id);
								setSelectedTargetUserId(null);
								setRefreshToken((x) => x + 1);
							}}
						/>
					) : (
						<div className="h-full flex items-center justify-center">
							<p className="vx-body text-tertiary">Seleccioná un chat para empezar</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
