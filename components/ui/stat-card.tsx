import { MotionReveal } from "./motion-reveal";
import { Card } from "./card";

export function StatCard({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <MotionReveal delay={delay}>
      <Card className="h-full p-6 md:p-7">
        <div className="text-4xl font-semibold text-vx-amber md:text-5xl">{value}</div>
        <div className="mt-3 text-sm leading-6 text-white/72">{label}</div>
      </Card>
    </MotionReveal>
  );
}
