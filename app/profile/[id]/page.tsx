/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuth } from "@/lib/auth";
import ProfileDomains from "@/components/ProfileDomains";

type AimEvent = {
	id: string;
	type: string;
	value: number;
	context?: string | null;
	createdAt: string;
};

type AimScoreHistory = {
	id: string;
	score: number;
	context?: string | null;
	createdAt: string;
};

type AimUser = {
	id: string;
	email: string;
	aimScore: number;
	aimStatus: string;
	created_at: string;
};

type ActivityItem = {
	id: string;
	label: string;
	sublabel?: string;
	delta: number;
	deltaLabel: string;
	source: "global" | "domain";
	domain?: string;
	createdAt: string;
};

export default function ProfilePage() {
	const params = useParams<{ id: string }>();
	const userId = params.id;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<AimUser | null>(null);
	const [events, setEvents] = useState<AimEvent[]>([]);
	const [history, setHistory] = useState<AimScoreHistory[]>([]);
	const [breakdown, setBreakdown] = useState<{ label: string; delta: number }[]>([]);
	const [activity, setActivity] = useState<ActivityItem[]>([]);
	const [prevScore, setPrevScore] = useState<number | null>(null);

	// Check if the logged-in user is viewing their own profile
	const currentAuth = typeof window !== "undefined" ? getAuth() : null;
	const isOwnProfile = currentAuth?.user?.id === userId;

	async function load() {
		try {
			setError(null);
			const resp = await fetch(`/api/aim/${userId}`, { cache: "no-store" });
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || "Failed to load");
			setPrevScore((s) => (data.user ? s : s)); // keep previous
			setUser(data.user);
			setEvents(data.events || []);
			setHistory(data.history || []);
			setBreakdown(data.breakdown || []);
			setActivity(data.activity || []);
		} catch (e: any) {
			setError(e?.message || "Unknown error");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
		const interval = setInterval(load, 10_000); // auto-refresh every 10s
		return () => clearInterval(interval);
	}, [userId]);

	return (
		<div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
			<h1 className="text-2xl font-semibold">Adaptive Integrity System</h1>

			{loading && <div>Loading...</div>}
			{error && <div className="text-red-600">Error: {error}</div>}

			{user && (
				<div className="grid grid-cols-1 gap-6">
					{/* HERO: Circular Score + Status + User */}
					<div className="w-full flex flex-col items-center justify-center rounded-lg border p-6 md:p-8">
						<div className="w-full flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
							<div className="flex-1 flex items-center justify-center">
								<CircularScore value={user.aimScore} history={history} status={user.aimStatus} />
							</div>
							<div className="flex-1 max-w-md w-full">
								<div className="grid grid-cols-1 gap-3">
									<div className="p-4 border rounded-md">
										<div className="text-sm text-gray-500">User</div>
										<div className="font-medium break-all">{user.email}</div>
										<div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
									</div>
									<div className="p-4 border rounded-md flex items-center justify-between">
										<div className="text-sm text-gray-500">Status</div>
										<StatusBadge status={user.aimStatus} />
									</div>
								</div>
							</div>
						</div>

						{/* Trust Trajectory */}
						<div className="w-full mt-6">
							<h2 className="text-lg font-semibold mb-2">Trust Trajectory</h2>
							<div className="p-4 border rounded-md">
								{history.length > 1 ? (
									<Sparkline data={history.map(h => h.score)} />
								) : (
									<div className="text-gray-500 text-sm">Not enough data to chart</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ── DOMAINS SECTION ── inserted after AIM Score hero, before the feed ── */}
			{userId && (
				<div className="w-full">
					<ProfileDomains userId={userId} isOwnProfile={isOwnProfile} />
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* ── AIM Activity Feed ─────────────────────────────────────── */}
				<div>
					<h2 className="text-xl font-semibold mb-2">What's affecting your score</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden divide-y divide-vx-divider">
						{activity.length === 0 && (
							<div className="p-5 text-sm text-vx-text-secondary">
								No activity yet. Trust votes, challenges and reliability outcomes will appear here.
							</div>
						)}
						{activity.map((item) => (
							<ActivityRow key={item.id} item={item} />
						))}
					</div>
				</div>

				{/* ── Score History ─────────────────────────────────────────── */}
				<div>
					<h2 className="text-xl font-semibold mb-2">Score History</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden divide-y divide-vx-divider">
						{history.length === 0 && (
							<div className="p-5 text-sm text-vx-text-secondary">No history</div>
						)}
						{history.map((h) => (
							<div key={h.id} className="px-5 py-3 flex items-center justify-between gap-4">
								<div className="space-y-0.5">
									<div className="text-xs text-vx-text-tertiary">{h.context || "score update"}</div>
									<div className="text-xs text-vx-text-tertiary">{new Date(h.createdAt).toLocaleString()}</div>
								</div>
								<div className="font-semibold tabular-nums text-sm">{h.score.toFixed(4)}</div>
							</div>
						))}
					</div>

					{/* Challenge Layer (placeholder) */}
					<h2 className="text-xl font-semibold mt-6 mb-2">Challenge Layer</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel p-4 flex items-center justify-between">
						<div className="text-sm text-vx-text-secondary">No challenges pending</div>
						<button className="vx-btn-primary rounded-lg text-sm font-semibold px-5 py-2.5">
							Flag an interaction
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Activity feed row ────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
	const isPositive = item.delta >= 0;
	const deltaColor = isPositive ? "text-vx-green" : "text-vx-red";
	const sourceBadgeColor =
		item.source === "domain"
			? "bg-vx-amber/10 text-vx-amber border-vx-amber/30"
			: "bg-blue-500/10 text-blue-400 border-blue-400/30";
	const sourceLabel = item.source === "domain" ? "Domain" : "Global";

	return (
		<div className="px-5 py-3.5 flex items-start justify-between gap-4">
			<div className="flex-1 min-w-0 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium text-vx-text">{item.label}</span>
					<span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${sourceBadgeColor} shrink-0`}>
						{sourceLabel}
					</span>
				</div>
				{item.sublabel && (
					<div className="text-xs text-vx-text-secondary">{item.sublabel}</div>
				)}
				<div className="text-xs text-vx-text-tertiary">
					{new Date(item.createdAt).toLocaleString()}
				</div>
			</div>
			<div className={`font-semibold tabular-nums text-sm shrink-0 ${deltaColor}`}>
				{item.deltaLabel}
			</div>
		</div>
	);
}

function Sparkline({ data }: { data: number[] }) {
	const width = 300;
	const height = 80;
	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;
	const points = data.map((v, i) => {
		const x = (i / (data.length - 1)) * width;
		const y = height - ((v - min) / range) * height;
		return `${x},${y}`;
	}).join(" ");

	return (
		<svg className="text-vx-amber" width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
			<polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
		</svg>
	);
}

function CircularScore({ value, history, status }: { value: number; history: AimScoreHistory[]; status: string }) {
	// Fixed scale: 0–100%
	let pct = Math.max(0, Math.min(100, value));

	const size = 180;
	const stroke = 12;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dash = (pct / 100) * circumference;

	// Force the ring to use brand amber as requested
	const colorClass = "text-vx-amber";

	return (
		<div className={`relative ${colorClass}`} style={{ width: size, height: size }}>
			<svg width={size} height={size}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="var(--bg-panel)"
					strokeWidth={stroke}
					fill="none"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={stroke}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={`${dash} ${circumference - dash}`}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div className="text-3xl font-bold">{value.toFixed(2)}%</div>
				<div className="text-xs text-gray-600 mt-1">AIM Score</div>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { label: string; className: string }> = {
		increasing: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
		decreasing: { label: "Under Review", className: "bg-red-50 text-red-700 border-red-200" },
		decaying: { label: "Decaying", className: "bg-yellow-50 text-yellow-800 border-yellow-200" },
		stable: { label: "Stable", className: "bg-[rgba(255,184,77,0.10)] text-vx-amber border-vx-amber" }
	};
	const info = map[status] ?? map.stable;
	return (
		<span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${info.className}`}>
			{info.label}
		</span>
	);
}
