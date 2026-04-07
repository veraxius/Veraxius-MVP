"use client";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { ConversationSearch } from "@/components/ConversationSearch";
import { ChatWindow } from "@/components/ChatWindow";

export default function MessagesPage() {
	const router = useRouter();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTarget, setSelectedTarget] = useState<{ id: string; email: string; name?: string } | null>(null);
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
			<div className="h-full w-full flex">
				{/* Left column: sidebar */}
				<div className="w-[320px] h-full border-r border-[var(--divider)] flex flex-col">
					<div className="p-3 flex items-center justify-center border-b border-[var(--divider)]">
						<h2 className="vx-h4 text-center w-full">Chats</h2>
					</div>
					<ConversationSearch
						onSelectTarget={(target) => {
							setSelectedTarget(target);
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
					) : selectedTarget ? (
						<ChatWindow
							targetUserId={selectedTarget.id}
							targetEmail={selectedTarget.email}
							targetName={selectedTarget.name}
							onConversationCreated={(conv) => {
								setSelectedId(conv.id);
								setSelectedTarget(null);
								setRefreshToken((x) => x + 1);
							}}
						/>
					) : (
						<div className="h-full flex items-center justify-center">
							<p className="vx-body text-tertiary">Select a chat to get started</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
