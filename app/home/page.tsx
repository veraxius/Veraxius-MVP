'use client';

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { cn } from "@/lib/utils";

type Post = {
  id: number;
  userId: string;
  userName: string;
  userVerified: boolean;
  content: string;
  createdAt: string;
  reactions: { id: number; postId: number; userId: string; type: string }[];
  comments: { id: number; postId: number; userId: string; userName: string; content: string; createdAt: string }[];
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [compose, setCompose] = useState("");
  const [openMessages, setOpenMessages] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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

  const me = useMemo(() => getAuth()?.user ?? null, []);

  function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase() || name.slice(0, 2).toUpperCase();
  }

  function nameColor(name: string) {
    const hues = [18, 32, 140, 200, 260];
    const h = hues[Math.abs(hashCode(name)) % hues.length];
    return `hsl(${h} 60% 35%)`;
  }
  function hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
  }

  async function submitPost() {
    const text = compose.trim();
    if (!text) return;
    const optimistic: Post = {
      id: -(Date.now() % 100000),
      userId: me?.id || "me",
      userName: me?.name || me?.email?.split("@")[0] || "me",
      userVerified: false,
      content: text,
      createdAt: new Date().toISOString(),
      reactions: [],
      comments: []
    };
    setPosts((p) => [optimistic, ...p]);
    setCompose("");
    try {
      const auth = getAuth();
      const resp = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth?.token ? `Bearer ${auth.token}` : "" },
        body: JSON.stringify({ content: text })
      });
      const data = await resp.json();
      if (resp.ok) {
        setPosts((p) => p.map((x) => x.id === optimistic.id ? data : x));
      } else {
        setPosts((p) => p.filter((x) => x.id !== optimistic.id));
        setError(data?.error || "Failed to post");
      }
    } catch (e: any) {
      setPosts((p) => p.filter((x) => x.id !== optimistic.id));
      setError(e?.message || "Failed to post");
    }
  }

  async function toggleReaction(postId: number, type: "util" | "confiable" | "not_reliable") {
    const auth = getAuth();
    if (!auth?.user?.id) return;
    const mine = (p: Post) => p.reactions.some(r => r.userId === auth.user.id && r.type === type);
    setPosts((p) => p.map(post => {
      if (post.id !== postId) return post;
      const has = mine(post);
      return {
        ...post,
        reactions: has ? post.reactions.filter(r => !(r.userId === auth.user.id && r.type === type))
                       : [...post.reactions, { id: -(Date.now()%1e6), postId, userId: auth.user.id, type }]
      };
    }));
    try {
      await fetch(`${API_URL}/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth?.token ? `Bearer ${auth.token}` : "" },
        body: JSON.stringify({ type })
      });
      loadPosts();
    } catch {/* ignore */}
  }

  async function addComment(postId: number, text: string) {
    const auth = getAuth();
    if (!auth?.user?.id || !text.trim()) return;
    const optimistic = {
      id: -(Date.now()%1e6),
      postId,
      userId: auth.user.id,
      userName: auth.user.email?.split("@")[0] || "me",
      content: text.trim(),
      createdAt: new Date().toISOString()
    };
    setPosts((p) => p.map(post => post.id === postId ? { ...post, comments: [...post.comments, optimistic] } : post));
    try {
      await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth?.token ? `Bearer ${auth.token}` : "" },
        body: JSON.stringify({ content: text.trim() })
      });
      loadPosts();
    } catch {/* ignore */}
  }

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="mx-auto w-full max-w-vx-content">
        {/* Top bar actions (messages opener is already in global navbar, keep a secondary subtle button here) */}
        <div className="mb-6 flex items-center justify-between">
          <div className="vx-eyebrow-with-line"><span className="vx-eyebrow">Veraxius</span></div>
          <div />
        </div>

        {/* Compose */}
        <section className="mb-8 rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-4">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: nameColor(me?.email?.split("@")[0] || "me"), color: "#fff" }}
            >
              {initials(me?.email?.split("@")[0] || "ME")}
            </div>
            <div className="flex-1">
              <textarea
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                placeholder="What would you like to share today?"
                className={cn(
                  "w-full resize-none rounded-lg border bg-transparent px-4 py-3 outline-none",
                  "border-[var(--divider)] focus:border-[var(--amber-border)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                )}
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button onClick={submitPost} className="vx-btn-primary rounded-lg px-5">POST</button>
              </div>
            </div>
          </div>
        </section>

        {/* Feed */}
        <section className="space-y-4">
          {loading && <div className="text-secondary">Cargando…</div>}
          {error && <div className="text-red">{error}</div>}
          {!loading && posts.map((p) => <PostCard key={p.id} post={p} onReact={toggleReaction} onComment={addComment} />)}
        </section>

        {/* Marketplace removed as requested */}
      </div>

      {/* Floating Messages Panel */}
      {openMessages && (
        <div className="fixed inset-0 z-50" onClick={() => setOpenMessages(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute right-4 top-16 w-[min(100%,380px)] h-[70vh] rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {!activeConversationId ? (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-[var(--divider)] flex items-center justify-between">
                  <div className="vx-mono text-sm">Mensajes</div>
                  <button onClick={() => setOpenMessages(false)} className="text-secondary text-sm">Cerrar</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ConversationList activeId={null} onSelect={(id) => setActiveConversationId(id)} refreshToken={0} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-[var(--divider)] flex items-center gap-2">
                  <button className="text-sm" onClick={() => setActiveConversationId(null)}>← Volver</button>
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

function PostCard({ post, onReact, onComment }: { post: Post; onReact: (id: number, t: "util"|"confiable"|"not_reliable") => void; onComment: (id: number, text: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState("");
  const me = getAuth()?.user;
  const reactions = post.reactions ?? [];
  const comments = post.comments ?? [];
  const reactedUtil = !!reactions.find(r => r.userId === me?.id && r.type === "util");
  const reactedConf = !!reactions.find(r => r.userId === me?.id && r.type === "confiable");
  const reactedNotRel = !!reactions.find(r => r.userId === me?.id && r.type === "not_reliable");

  function relTime(iso: string) {
    const d = new Date(iso).getTime();
    const diff = (Date.now() - d) / 1000;
    if (diff < 60) return "ahora";
    if (diff < 3600) return `${Math.floor(diff/60)}min`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase() || name.slice(0, 2).toUpperCase();
  }
  function nameColor(name: string) {
    const hues = [18, 32, 140, 200, 260];
    const h = hues[Math.abs(hashCode(name)) % hues.length];
    return `hsl(${h} 60% 35%)`;
  }
  function hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
  }

  return (
    <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-panel)] p-4">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ backgroundColor: nameColor(post.userName), color: "#fff" }}
        >
          {initials(post.userName)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{post.userName}</span>
            {post.userVerified && <span className="px-1.5 py-0.5 text-amber border border-amber rounded">verificado</span>}
            <span className="text-tertiary">· {relTime(post.createdAt)}</span>
          </div>
          <div className="mt-2 vx-body-sm text-primary whitespace-pre-wrap">{post.content}</div>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <button
              className="px-2 py-1 rounded border border-[var(--divider)] text-secondary hover:bg-white/5"
              onClick={() => setShowComments((v) => !v)}
            >
              {comments.length > 0 ? "Answers" : "Reply"} {comments.length}
            </button>
            <button
              className={cn("px-2 py-1 rounded border", reactedConf ? "bg-[var(--amber)] text-[var(--bg-primary)] border-[var(--amber)]" : "border-[var(--divider)] text-secondary hover:bg-white/5")}
              onClick={() => onReact(post.id, "confiable")}
            >
              Reliable {reactions.filter(r => r.type === "confiable").length}
            </button>
            <button
              className={cn(
                "px-2 py-1 rounded border",
                reactedNotRel ? "bg-[var(--red)] text-[var(--bg-primary)] border-[var(--red)]" : "border-[var(--divider)] text-secondary hover:bg-white/5"
              )}
              onClick={() => {
                if (reactedConf) onReact(post.id, "confiable"); // remove reliable if set
                onReact(post.id, "not_reliable");
              }}
              title="Toggle not reliable"
            >
              Not reliable {reactions.filter(r => r.type === "not_reliable").length}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                      style={{ backgroundColor: nameColor(c.userName), color: "#fff" }}
                    >
                      {initials(c.userName)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm"><span className="font-medium">{c.userName}</span> <span className="text-tertiary">· {relTime(c.createdAt)}</span></div>
                      <div className="vx-body-sm">{c.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onComment(post.id, text); setText(""); }
                  }}
                  placeholder="Write a reply…"
                  className={cn(
                    "flex-1 rounded-lg border bg-transparent px-3 py-2 outline-none",
                    "border-[var(--divider)] focus:border-[var(--amber-border)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  )}
                />
                <button onClick={() => { onComment(post.id, text); setText(""); }} className="vx-btn-primary rounded-lg px-4">Reply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
