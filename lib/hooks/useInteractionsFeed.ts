"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { getAuth } from "@/lib/auth";

/** Posts feed used as the MVP4 “interactions” surface (create post → domain signals → AIM). */

export type FeedPost = {
	id: number;
	userId: string;
	userName: string;
	userVerified: boolean;
	content: string;
	createdAt: string;
	reactions: { id: number; postId: number; userId: string; type: string }[];
	comments: {
		id: number;
		postId: number;
		userId: string;
		userName: string;
		content: string;
		createdAt: string;
	}[];
};

export function useInteractionsFeed() {
	const [posts, setPosts] = useState<FeedPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setError(null);
		try {
			const resp = await fetch(`${API_URL}/api/posts`, { cache: "no-store" });
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || "Failed to load posts");
			setPosts(data as FeedPost[]);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	async function createPost(content: string) {
		const auth = getAuth();
		const resp = await fetch(`${API_URL}/api/posts`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: auth?.token ? `Bearer ${auth.token}` : "",
			},
			body: JSON.stringify({ content }),
		});
		const data = await resp.json();
		if (!resp.ok) throw new Error(data?.error || "Failed to post");
		await refresh();
		return data as FeedPost;
	}

	return { posts, loading, error, refresh, createPost };
}
