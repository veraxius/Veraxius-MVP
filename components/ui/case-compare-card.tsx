import { MotionReveal } from "./motion-reveal";
import { Card } from "./card";
import { SignalBadge } from "./signal-badge";

export function CaseCompareCard({ title, points, tone, delay = 0 }: { title: string; points: string[]; tone: "red" | "green"; delay?: number }) {
  return (
    <MotionReveal delay={delay}>
      <Card className="h-full p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-vx-text">{title}</h3>
          <SignalBadge label={tone === "red" ? "Higher risk" : "Stronger signal"} tone={tone} />
        </div>
        <ul className="mt-6 space-y-3">{points.map((point) => <li key={point} className="rounded-xl border border-vx-divider bg-white/[0.02] p-4 text-sm leading-6 text-white/72">{point}</li>)}</ul>
      </Card>
    </MotionReveal>
  );
}
