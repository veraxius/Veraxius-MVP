"use client";

import { useEffect, useMemo, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuth } from "./auth";
import { API_URL } from "./api";

type NewMessagePayload = { id: string; conversationId: string; senderId: string; content: string; created_at: string };

export function useSocket() {
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		const auth = getAuth();
		const token = auth?.token;
		const socket = io(API_URL, {
			auth: { token },
			withCredentials: true
		});
		socketRef.current = socket;

		socket.on("connect", () => {
			socket.emit("join_conversations");
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, []);

	const api = useMemo(() => {
		return {
			sendMessage: (conversationId: string, content: string) => {
				socketRef.current?.emit("send_message", { conversationId, content });
			},
			startTyping: (conversationId: string) => {
				socketRef.current?.emit("typing", conversationId);
			},
			stopTyping: (conversationId: string) => {
				socketRef.current?.emit("stop_typing", conversationId);
			},
			markRead: (conversationId: string) => {
				socketRef.current?.emit("mark_read", conversationId);
			},
			onNewMessage: (cb: (msg: NewMessagePayload) => void) => {
				const handler = (msg: NewMessagePayload) => cb(msg);
				socketRef.current?.on("new_message", handler);
				return () => socketRef.current?.off("new_message", handler);
			},
			onTyping: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socketRef.current?.on("typing", handler);
				return () => socketRef.current?.off("typing", handler);
			},
			onStopTyping: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socketRef.current?.on("stop_typing", handler);
				return () => socketRef.current?.off("stop_typing", handler);
			},
			onMessagesRead: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socketRef.current?.on("messages_read", handler);
				return () => socketRef.current?.off("messages_read", handler);
			}
		};
	}, []);

	return api;
}
