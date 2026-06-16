"use client";

import { useEffect, useMemo, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuth } from "./auth";
import { API_URL } from "./api";

type NewMessagePayload = { id: string; conversationId: string; senderId: string; content: string; created_at: string };

let sharedSocket: Socket | null = null;
let socketSubscribers = 0;

function getOrCreateSocket(): Socket {
	if (sharedSocket) return sharedSocket;

	const auth = getAuth();
	const socket = io(API_URL, {
		auth: { token: auth?.token },
		withCredentials: true,
	});
	sharedSocket = socket;

	socket.on("connect", () => {
		socket.emit("join_conversations");
	});

	return socket;
}

export function useSocket() {
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		socketSubscribers += 1;
		const socket = getOrCreateSocket();
		socketRef.current = socket;

		return () => {
			socketSubscribers -= 1;
			if (socketSubscribers <= 0 && sharedSocket) {
				sharedSocket.disconnect();
				sharedSocket = null;
				socketSubscribers = 0;
			}
			socketRef.current = null;
		};
	}, []);

	const api = useMemo(() => {
		const socket = () => socketRef.current ?? sharedSocket;
		return {
			sendMessage: (conversationId: string, content: string) => {
				socket()?.emit("send_message", { conversationId, content });
			},
			startTyping: (conversationId: string) => {
				socket()?.emit("typing", conversationId);
			},
			stopTyping: (conversationId: string) => {
				socket()?.emit("stop_typing", conversationId);
			},
			markRead: (conversationId: string) => {
				socket()?.emit("mark_read", conversationId);
			},
			joinConversations: () => {
				socket()?.emit("join_conversations");
			},
			onConnect: (cb: () => void) => {
				const socket = socketRef.current ?? sharedSocket;
				if (!socket) return () => {};
				const handler = () => cb();
				socket.on("connect", handler);
				if (socket.connected) handler();
				return () => socket.off("connect", handler);
			},
			onNewMessage: (cb: (msg: NewMessagePayload) => void) => {
				const socket = socketRef.current ?? sharedSocket;
				if (!socket) return () => {};
				const handler = (msg: NewMessagePayload) => cb(msg);
				socket.on("new_message", handler);
				return () => socket.off("new_message", handler);
			},
			onTyping: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const socket = socketRef.current ?? sharedSocket;
				if (!socket) return () => {};
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socket.on("typing", handler);
				return () => socket.off("typing", handler);
			},
			onStopTyping: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const socket = socketRef.current ?? sharedSocket;
				if (!socket) return () => {};
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socket.on("stop_typing", handler);
				return () => socket.off("stop_typing", handler);
			},
			onMessagesRead: (cb: (data: { conversationId: string; userId: string }) => void) => {
				const socket = socketRef.current ?? sharedSocket;
				if (!socket) return () => {};
				const handler = (d: { conversationId: string; userId: string }) => cb(d);
				socket.on("messages_read", handler);
				return () => socket.off("messages_read", handler);
			},
		};
	}, []);

	return api;
}
