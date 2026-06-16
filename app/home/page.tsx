'use client';

// test

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notifyAimRefresh } from "@/lib/aimEvents";
import { UserAvatar } from "@/components/UserAvatar";
import { AIMGaugeRing } from "@/components/AIMGaugeRing";
import { riskGaugeColorClass } from "@/lib/aimDisplay";
import { useAIMScore } from "@/lib/hooks/useAIMScore";

type ReactionType = "confiable" | "not_reliable";

type Post = {
  id: number;
  userId: string;
  userName: string;
  userVerified: boolean;
  userProfilePictureUrl?: string | null;
  content: string;
  createdAt: string;
  reactions: { id: number; postId: number; userId: string; type: string }[];
  comments: {
    id: number;
    postId: number;
    userId: string;
    userName: string;
    userProfilePictureUrl?: string | null;
    content: string;
    createdAt: string;
  }[];
};

function isReliableReactionType(type: string) {
  return type === "reliable" || type === "confiable";
}

function userHasReaction(
  reactions: Post["reactions"],
  userId: string,
  type: ReactionType,
) {
  if (type === "confiable") {
    return reactions.some((r) => r.userId === userId && isReliableReactionType(r.type));
  }
  return reactions.some((r) => r.userId === userId && r.type === type);
}

function applyOptimisticReaction(
  posts: Post[],
  postId: number,
  userId: string,
  type: ReactionType,
): Post[] {
  return posts.map((post) => {
    if (post.id !== postId) return post;

    const reactions = post.reactions ?? [];
    const active = userHasReaction(reactions, userId, type);

    if (active) {
      return {
        ...post,
        reactions: reactions.filter((r) => {
          if (r.userId !== userId) return true;
          if (type === "confiable") return !isReliableReactionType(r.type);
          return r.type !== type;
        }),
      };
    }

    return {
      ...post,
      reactions: [
        ...reactions,
        {
          id: -(postId * 10 + (type === "confiable" ? 1 : 2)),
          postId,
          userId,
          type,
        },
      ],
    };
  });
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [compose, setCompose] = useState("");
  const [openMessages, setOpenMessages] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const me = useMemo(() => getAuth()?.user ?? null, []);
  const { summary: mySummary, loading: aimLoading, refresh: refreshMyAim } = useAIMScore(me?.id);

  async function loadPosts() {
    try {
      setError(null);
      const resp = await fetch(`${API_URL}/api/posts`, { cache: "no-store" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load posts");
      setPosts(data as Post[]);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    function onAvatarUpdated() {
      void refreshMyAim();
      void loadPosts();
    }
    window.addEventListener("vx-avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("vx-avatar-updated", onAvatarUpdated);
  }, [refreshMyAim]);

  async function submitPost() {
    const text = compose.trim();
    if (!text) return;

    const auth = getAuth();
    if (!auth?.token) {
      setError("Please login again");
      return;
    }

    try {
      setError(null);

      const resp = await apiFetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to post");

      setCompose("");
      await loadPosts();
    } catch (e: any) {
      setError(e?.message || "Failed to post");
    }
  }

  async function toggleReaction(postId: number, type: ReactionType) {
    const auth = getAuth();

    if (!auth?.token || !auth?.user?.id) {
      setError("Please login again");
      return;
    }

    const userId = auth.user.id;
    const snapshot = posts;

    setPosts((current) => applyOptimisticReaction(current, postId, userId, type));

    try {
      setError(null);

      const resp = await apiFetch(`${API_URL}/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Reaction failed");

      notifyAimRefresh();
      void loadPosts();
    } catch (e: any) {
      setPosts(snapshot);
      setError(e?.message || "Reaction failed");
    }
  }

  async function addComment(postId: number, text: string) {
    const auth = getAuth();

    if (!auth?.token || !auth?.user?.id) {
      setError("Please login again");
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) return;

    try {
      setError(null);

      const resp = await apiFetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cleanText }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Comment failed");

      await loadPosts();
    } catch (e: any) {
      setError(e?.message || "Comment failed");
    }
  }

  return (
    <main
      className="vx-home-surface min-h-screen w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      style={{ color: "var(--text-primary)" }}
    >
      <div className="mx-auto w-full max-w-vx-content min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <div className="vx-eyebrow-with-line vx-amber-neon-line">
            <span className="vx-mono text-amber vx-aim-neon text-[10px] sm:text-xs uppercase">
              Veraxius
            </span>
          </div>
          <div />
        </div>

        <section className="vx-feed-card mb-8 w-full rounded-2xl p-4 sm:p-5">
          {me?.id ? (
            <div className="mb-4 space-y-5 border-b border-[var(--divider)] pb-4">
              <div className="flex flex-col items-center gap-5 lg:relative lg:min-h-[12.5rem] lg:justify-center">
                <div className="flex w-full max-w-md flex-col items-center text-center lg:absolute lg:left-6 xl:left-8 lg:top-1/2 lg:z-10 lg:max-w-[min(46%,20rem)] xl:max-w-[min(48%,22rem)] lg:-translate-y-1/2 lg:items-start lg:text-left">
                  <p className="vx-mono text-amber text-base sm:text-lg md:text-xl font-semibold leading-tight tracking-wide">
                    Trust proven in motion
                  </p>
                  <div className="mt-1.5 sm:mt-2 w-full text-xs sm:text-sm text-[var(--text-secondary)] leading-snug tracking-[0.04em] sm:tracking-[0.05em]">
                    <span className="block">Adaptive trust evaluation through</span>
                    <span className="block">behavior, signals, explainability,</span>
                    <span className="block">and governance.</span>
                  </div>
                </div>

                {aimLoading && !mySummary ? (
                  <div className="h-36 w-36 sm:h-44 sm:w-44 shrink-0 rounded-full bg-[var(--surface-subtle)] animate-pulse" />
                ) : mySummary ? (
                  <Link href={`/profile/${me.id}`} className="shrink-0" title="View your AIM profile">
                    <AIMGaugeRing
                      aimFraction={mySummary.global_score}
                      colorClass={riskGaugeColorClass(mySummary.risk_level)}
                      compact
                    />
                  </Link>
                ) : null}
              </div>

              <TrustFeatureMiniCards />
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            {me?.id ? (
              <UserAvatar
                userId={me.id}
                name={me.name}
                email={me.email}
                profilePictureUrl={mySummary?.user?.profilePictureUrl ?? null}
                size="md"
              />
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:gap-2 sm:gap-3">
              <textarea
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitPost();
                  }
                }}
                placeholder="What would you like to share today?"
                className={cn(
                  "flex-1 min-w-0 resize-none rounded-xl border bg-surface-subtle px-4 py-2.5 min-h-11 text-base sm:text-sm outline-none",
                  "border-subtle focus:border-[var(--amber-border)] focus:bg-[var(--surface-input-focus)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                  "transition-colors"
                )}
                rows={2}
              />

              <button
                type="button"
                onClick={submitPost}
                className="vx-btn-primary vx-post-btn min-h-11 shrink-0 self-end rounded-xl px-4 text-sm font-semibold min-[420px]:self-auto sm:px-5 sm:text-base"
              >
                POST
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {loading && <div className="text-secondary">Loading…</div>}
          {error && <div className="text-red">{error}</div>}

          {!loading &&
            posts.map((p) => (
              <PostCard key={p.id} post={p} onReact={toggleReaction} onComment={addComment} />
            ))}
        </section>
      </div>

      {openMessages && (
        <div className="fixed inset-0 z-50" onClick={() => setOpenMessages(false)}>
          <div className="absolute inset-0 bg-overlay-scrim" />

          <div
            className="absolute inset-x-4 top-16 sm:inset-x-auto sm:right-4 sm:left-auto w-[calc(100%-2rem)] sm:w-full sm:max-w-md h-[min(70vh,32rem)] rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {!activeConversationId ? (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-[var(--divider)] flex items-center justify-between">
                  <div className="vx-mono text-sm">Messages</div>
                  <button
                    type="button"
                    onClick={() => setOpenMessages(false)}
                    className="min-h-11 px-3 text-secondary text-sm"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <ConversationList activeId={null} onSelect={(id) => setActiveConversationId(id)} refreshToken={0} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-[var(--divider)] flex items-center gap-2">
                  <button
                    type="button"
                    className="min-h-11 px-3 text-sm"
                    onClick={() => setActiveConversationId(null)}
                  >
                    ← Back
                  </button>
                </div>

                <div className="flex-1">
                  <ChatWindow conversationId={activeConversationId} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function TrustFeatureIcon({ type }: { type: "lightbulb" | "explainable" | "document" }) {
  const className =
    "h-4 w-4 shrink-0 text-[#FFD99A] drop-shadow-[0_0_2px_rgba(255,201,120,0.35)]";

  if (type === "lightbulb") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 22h4" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z"
        />
      </svg>
    );
  }

  if (type === "explainable") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h8" />
    </svg>
  );
}

const TRUST_FEATURE_CARDS = [
  { id: "realtime", label: "Real-time evaluation", icon: "lightbulb" as const },
  { id: "explainable", label: "Explainable", icon: "explainable" as const },
  { id: "auditable", label: "Auditable", icon: "document" as const },
];

function TrustFeatureMiniCards() {
  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3">
      {TRUST_FEATURE_CARDS.map((card) => (
        <div
          key={card.id}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-[var(--divider)]",
            "bg-[var(--surface-subtle)] px-2.5 py-2.5 sm:px-3 sm:py-3",
            "text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] text-center min-w-0",
          )}
        >
          <TrustFeatureIcon type={card.icon} />
          <span className="leading-tight">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

function PostCard({
  post,
  onReact,
  onComment,
}: {
  post: Post;
  onReact: (id: number, t: ReactionType) => void;
  onComment: (id: number, text: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState("");

  const me = getAuth()?.user;
  const isOwnPost = Boolean(me?.id && me.id === post.userId);
  const reactions = post.reactions ?? [];
  const comments = post.comments ?? [];

  const reliableCount = reactions.filter(
    (r) => r.type === "reliable" || r.type === "confiable"
  ).length;

  const notReliableCount = reactions.filter(
    (r) => r.type === "not_reliable"
  ).length;

  const reactedReliable = reactions.some(
    (r) => r.userId === me?.id && (r.type === "reliable" || r.type === "confiable")
  );

  const reactedNotReliable = reactions.some(
    (r) => r.userId === me?.id && r.type === "not_reliable"
  );

  function relTime(iso: string) {
    const d = new Date(iso).getTime();
    const diff = (Date.now() - d) / 1000;

    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;

    return `${Math.floor(diff / 86400)}d`;
  }

  async function handleCommentSubmit() {
    const cleanText = text.trim();
    if (!cleanText) return;

    await onComment(post.id, cleanText);
    setText("");
  }

  return (
    <div className="vx-feed-card w-full min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.userId}`} className="shrink-0" title={post.userName}>
          <UserAvatar
            userId={post.userId}
            name={post.userName}
            profilePictureUrl={post.userProfilePictureUrl}
            size="md"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm min-w-0">
            <Link href={`/profile/${post.userId}`} className="font-semibold hover:underline truncate max-w-full">
              {post.userName}
            </Link>

            {post.userVerified && (
              <span className="px-1.5 py-0.5 text-xs text-amber border border-amber/30 rounded-md bg-amber/5">
                Verified
              </span>
            )}

            <span className="text-tertiary">· {relTime(post.createdAt)}</span>
          </div>

          <div className="mt-2 vx-body-sm text-primary whitespace-pre-wrap">
            {post.content}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              className="vx-feed-action min-h-11 px-3 py-2 rounded-lg text-secondary"
              onClick={() => setShowComments((v) => !v)}
            >
              {comments.length > 0 ? "Answers" : "Reply"} {comments.length}
            </button>

            {!isOwnPost && (
              <>
                <button
                  type="button"
                  className={cn(
                    "min-h-11 px-3 py-2 rounded-lg text-sm transition-colors",
                    reactedReliable
                      ? "bg-[var(--amber)] text-[var(--text-on-amber)] border border-[var(--amber)]"
                      : "vx-feed-action text-secondary"
                  )}
                  onClick={() => onReact(post.id, "confiable")}
                >
                  Reliable {reliableCount}
                </button>

                <button
                  type="button"
                  className={cn(
                    "min-h-11 px-3 py-2 rounded-lg text-sm transition-colors",
                    reactedNotReliable
                      ? "bg-[var(--red)] text-[var(--text-on-amber)] border border-[var(--red)]"
                      : "vx-feed-action text-secondary"
                  )}
                  onClick={() => onReact(post.id, "not_reliable")}
                >
                  Not reliable {notReliableCount}
                </button>
              </>
            )}
          </div>

          {showComments && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Link href={`/profile/${c.userId}`} className="shrink-0" title={c.userName}>
                      <UserAvatar
                        userId={c.userId}
                        name={c.userName}
                        profilePictureUrl={c.userProfilePictureUrl}
                        size="sm"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <Link
                          href={`/profile/${c.userId}`}
                          className="font-medium hover:underline"
                        >
                          {c.userName}
                        </Link>{" "}
                        <span className="text-tertiary">· {relTime(c.createdAt)}</span>
                      </div>

                      <div className="vx-body-sm">{c.content}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                  placeholder="Write a reply…"
                  className={cn(
                    "flex-1 min-w-0 rounded-xl border bg-surface-subtle px-3 py-2.5 min-h-11 text-base sm:text-sm outline-none",
                    "border-subtle focus:border-[var(--amber-border)] focus:bg-[var(--surface-input-focus)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                    "transition-colors"
                  )}
                />

                <button
                  type="button"
                  onClick={handleCommentSubmit}
                  className="vx-btn-primary min-h-11 shrink-0 self-end rounded-xl px-4 text-sm font-semibold min-[400px]:self-auto"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}