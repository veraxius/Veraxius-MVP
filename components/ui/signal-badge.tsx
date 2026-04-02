import { cn } from "@/lib/utils";

const toneMap = {
  neutral: "border-white/10 bg-white/5 text-white/70",
  amber: "border-vx-amber/20 bg-vx-amber/10 text-vx-amber",
  green: "border-vx-green/20 bg-vx-green/10 text-vx-green",
  red: "border-vx-red/20 bg-vx-red/10 text-vx-red",
  blue: "border-vx-blue/20 bg-vx-blue/10 text-vx-blue"
};

export function SignalBadge({
  label,
  tone = "neutral",
  className = ""
}: {
  label: string;
  tone?: keyof typeof toneMap;
  className?: string;
}) {
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", toneMap[tone], className)}>{label}</span>;
}
