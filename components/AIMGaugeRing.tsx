"use client";

import {
	aimGaugeFillFraction,
	formatAimScoreLabel,
	normalizeAimFraction,
} from "@/lib/aimDisplay";
import { cn } from "@/lib/utils";

type Props = {
	/** 0–1 global AIM (matches DB `aimScore`). */
	aimFraction: number;
	colorClass: string;
	compact?: boolean;
	className?: string;
};

export function AIMGaugeRing({
	aimFraction,
	colorClass,
	compact = false,
	className,
}: Props) {
	const score = normalizeAimFraction(aimFraction);
	const fillRatio = aimGaugeFillFraction(aimFraction);
	const size = compact ? 200 : 180;
	const stroke = compact ? 13 : 12;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashoffset = circumference * (1 - fillRatio);
	const center = size / 2;

	return (
		<div
			className={cn(
				"relative aspect-square w-full shrink-0 mx-auto",
				compact
					? "max-w-[8.5rem] sm:max-w-[11rem] md:max-w-[12.5rem]"
					: "max-w-[120px] sm:max-w-[160px] md:max-w-[180px]",
				colorClass,
				className,
			)}
		>
			<svg
				className="w-full h-full"
				viewBox={`0 0 ${size} ${size}`}
				preserveAspectRatio="xMidYMid meet"
				aria-hidden
			>
				<circle
					cx={center}
					cy={center}
					r={radius}
					stroke="var(--bg-panel)"
					strokeWidth={stroke}
					fill="none"
				/>
				<circle
					cx={center}
					cy={center}
					r={radius}
					stroke="currentColor"
					strokeWidth={stroke}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={dashoffset}
					transform={`rotate(-90 ${center} ${center})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center px-2">
				<div
					className={cn(
						"font-bold tabular-nums leading-none",
						compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl",
					)}
				>
					{formatAimScoreLabel(score)}
				</div>
				<div
					className={cn(
						"font-medium",
						compact ? "text-xs sm:text-sm mt-1 sm:mt-1.5" : "text-xs mt-1",
					)}
				>
					<span className="text-amber">AIM</span>
					<span className="text-[var(--text-secondary)]"> Score</span>
				</div>
			</div>
		</div>
	);
}
