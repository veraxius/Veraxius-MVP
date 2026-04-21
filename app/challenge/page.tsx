"use client";

import { useState } from "react";
import { getAuth } from "@/lib/auth";

type Challenge = {
  id: string;
  targetUserId: string;
  challengerId: string;
  reason: string;
  severity: number;
  status: string;
  resolution?: string | null;
  impact?: number | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
  resolved: "bg-green-500/10 text-green-400 border-green-400/30",
  rejected: "bg-red-500/10 text-red-400 border-red-400/30",
  under_review: "bg-orange-500/10 text-orange-400 border-orange-400/30",
};

function isUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export default function ChallengePage() {
  const auth = typeof window !== "undefined" ? getAuth() : null;
  const currentUserId = auth?.user?.id || "";

  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const [listUserId, setListUserId] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listMsg, setListMsg] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);

  const [resolution, setResolution] = useState<
    "upheld" | "dismissed" | "mixed" | "malicious"
  >("upheld");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitMsg(null);

    if (!currentUserId) {
      setSubmitMsg("You must be logged in.");
      return;
    }

    if (!targetUserId.trim()) {
      setSubmitMsg("Target User ID is required.");
      return;
    }

    if (!isUUID(targetUserId)) {
      setSubmitMsg("Please enter a valid User ID (UUID format).");
      return;
    }

    if (!reason.trim()) {
      setSubmitMsg("Reason is required.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3001/api/aim/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: targetUserId.trim(),
          challengerId: currentUserId,
          reason: reason.trim(),
          severity,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || "Internal server error"
        );
      }

      setSubmitMsg("✅ Challenge submitted successfully!");
      setTargetUserId("");
      setReason("");
      setSeverity(1);
    } catch (err: any) {
      setSubmitMsg(`❌ ${err?.message || "Internal server error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadChallenges = async () => {
    setListMsg(null);
    setResolveMsg(null);
    setSelected(null);
    setChallenges([]);

    if (!listUserId.trim()) {
      setListMsg("Please enter a User ID.");
      return;
    }

    if (!isUUID(listUserId)) {
      setListMsg("Please enter a valid User ID (UUID format).");
      return;
    }

    try {
      setListLoading(true);

      const res = await fetch(
        `http://localhost:3001/api/aim/challenges/${listUserId.trim()}`
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to load challenges"
        );
      }

      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.challenges)
        ? data.challenges
        : [];

      setChallenges(normalized);

      if (normalized.length === 0) {
        setListMsg("No challenges found for this user.");
      } else {
        setListMsg(`Loaded ${normalized.length} challenge(s).`);
      }
    } catch (err: any) {
      setListMsg(`❌ ${err?.message || "Failed to load challenges"}`);
    } finally {
      setListLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selected) return;

    try {
      setResolveLoading(true);
      setResolveMsg(null);

      const res = await fetch(
        `http://localhost:3001/api/aim/challenge/${selected.id}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resolution }),
        }
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to resolve");
      }

      const updatedChallenge = data?.challenge ?? {
        ...selected,
        status: "resolved",
        resolution,
      };

      setSelected(updatedChallenge);
      setChallenges((prev) =>
        prev.map((c) => (c.id === updatedChallenge.id ? updatedChallenge : c))
      );
      setResolveMsg("✅ Challenge resolved successfully!");
    } catch (err: any) {
      setResolveMsg(`❌ ${err?.message || "Failed to resolve challenge"}`);
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10 text-white">
      <section className="border border-vx-divider rounded-xl p-6 space-y-4 bg-vx-panel">
        <h1 className="text-2xl font-bold">Open a Challenge</h1>
        <p className="text-sm text-gray-400">
          Flag an interaction or user behaviour for review.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Target User ID
            </label>
            <input
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Enter target user ID"
              className="mt-1 w-full rounded-md border border-vx-divider bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-vx-amber"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you are raising this challenge..."
              rows={3}
              className="mt-1 w-full rounded-md border border-vx-divider bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-vx-amber"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Severity
            </label>
            <div className="mt-1 flex gap-2">
              {([1, 2, 3] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-4 py-1.5 rounded border text-sm font-medium ${
                    severity === s
                      ? "bg-vx-amber text-black border-vx-amber"
                      : "text-gray-400 border-gray-600 hover:border-gray-400"
                  }`}
                >
                  {s === 1 ? "Low" : s === 2 ? "Medium" : "High"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-vx-amber text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Challenge"}
          </button>

          {submitMsg && (
            <div className="rounded-md border border-vx-divider bg-black/20 px-3 py-2 text-sm text-center">
              {submitMsg}
            </div>
          )}
        </div>
      </section>

      <section className="border border-vx-divider rounded-xl p-6 space-y-4 bg-vx-panel">
        <h2 className="text-xl font-bold">View Challenges</h2>
        <p className="text-sm text-gray-400">
          Enter a user ID to view challenges opened by or against that user.
        </p>

        <div className="flex gap-2">
          <input
            value={listUserId}
            onChange={(e) => setListUserId(e.target.value)}
            placeholder="Enter user ID"
            className="flex-1 rounded-md border border-vx-divider bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-vx-amber"
          />
          <button
            onClick={handleLoadChallenges}
            disabled={listLoading}
            className="px-5 py-2 rounded-lg bg-vx-amber text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {listLoading ? "Loading..." : "Load"}
          </button>
        </div>

        {listMsg && (
          <div className="rounded-md border border-vx-divider bg-black/20 px-3 py-2 text-sm">
            {listMsg}
          </div>
        )}

        <div className="space-y-2">
          {challenges.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelected(c);
                setResolveMsg(null);
              }}
              className="w-full text-left p-4 border border-vx-divider rounded-lg hover:border-vx-amber transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium truncate">{c.reason}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${
                    STATUS_STYLES[c.status] || STATUS_STYLES.pending
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Severity: {c.severity} · {new Date(c.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="border border-vx-amber/40 rounded-xl p-6 space-y-4 bg-vx-panel">
          <h2 className="text-xl font-bold">Challenge Detail</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">ID</span>
              <span className="font-mono text-xs truncate max-w-xs">
                {selected.id}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Status</span>
              <span
                className={`text-xs px-2 py-0.5 rounded border font-medium ${
                  STATUS_STYLES[selected.status] || STATUS_STYLES.pending
                }`}
              >
                {selected.status}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Target User</span>
              <span className="font-mono text-xs truncate max-w-xs">
                {selected.targetUserId}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Challenger</span>
              <span className="font-mono text-xs truncate max-w-xs">
                {selected.challengerId}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Severity</span>
              <span>{selected.severity}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Created</span>
              <span>{new Date(selected.createdAt).toLocaleString()}</span>
            </div>

            <div className="pt-2">
              <p className="text-gray-400 mb-1">Reason</p>
              <div className="rounded-md border border-vx-divider bg-black/30 p-3">
                {selected.reason}
              </div>
            </div>

            {selected.resolution && (
              <div className="pt-2">
                <p className="text-gray-400 mb-1">Resolution</p>
                <div className="rounded-md border border-vx-divider bg-black/30 p-3">
                  {selected.resolution}
                </div>
              </div>
            )}

            {typeof selected.impact === "number" && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Impact</span>
                <span>{selected.impact}</span>
              </div>
            )}
          </div>

          <div className="border-t border-vx-divider pt-4 space-y-3">
            <h3 className="text-lg font-semibold">Admin Resolve</h3>

            <select
              value={resolution}
              onChange={(e) =>
                setResolution(
                  e.target.value as "upheld" | "dismissed" | "mixed" | "malicious"
                )
              }
              className="w-full rounded-md border border-vx-divider bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-vx-amber"
            >
              <option value="upheld">upheld</option>
              <option value="dismissed">dismissed</option>
              <option value="mixed">mixed</option>
              <option value="malicious">malicious</option>
            </select>

            <button
              onClick={handleResolve}
              disabled={resolveLoading}
              className="w-full py-2.5 rounded-lg bg-vx-amber text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {resolveLoading ? "Resolving..." : "Resolve Challenge"}
            </button>

            {resolveMsg && (
              <div className="rounded-md border border-vx-divider bg-black/20 px-3 py-2 text-sm">
                {resolveMsg}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}