import { MotionReveal } from "./motion-reveal";
import { Card } from "./card";

export function StackCard({ number, title, body, delay = 0 }: { number: string; title: string; body: string; delay?: number }) {
  return (
    <MotionReveal delay={delay}>
      <Card className="h-full p-6">
        <div className="text-sm font-semibold text-vx-amber">{number}</div>
        <h3 className="mt-3 text-xl font-semibold text-vx-text">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/72">{body}</p>
      </Card>
    </MotionReveal>
  );
}
