"use client";

import { useCallback } from "react";
import { API_URL, apiFetch } from "./api";

export function useConversations() {
	const list = useCallback(async () => {
		const res = await apiFetch(`${API_URL}/api/conversations`, {
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch conversations");
		return res.json();
	}, []);

	const history = useCallback(async (conversationId: string) => {
		const res = await apiFetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch messages");
		return res.json();
	}, []);

	const createConversation = useCallback(async (targetUserId: string) => {
		const res = await apiFetch(`${API_URL}/api/conversations`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ targetUserId }),
		});
		if (!res.ok) throw new Error((await res.json()).error || "Failed to create conversation");
		return res.json();
	}, []);

	return { list, history, createConversation };
}
