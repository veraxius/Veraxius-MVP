import { MotionReveal } from "./motion-reveal";
import { Card } from "./card";

export function StepCard({ number, body, delay = 0 }: { number: string; body: string; delay?: number }) {
  return (
    <MotionReveal delay={delay}>
      <Card className="h-full p-6">
        <div className="text-sm font-semibold text-vx-amber">{number}</div>
        <p className="mt-4 text-base leading-7 text-white/72">{body}</p>
      </Card>
    </MotionReveal>
  );
}
