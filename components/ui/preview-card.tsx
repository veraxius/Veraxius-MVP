import { Card } from "./card";
import { Button } from "./button";
import { SignalBadge } from "./signal-badge";

function toneClass(tone: "amber" | "green" | "red" | "blue") {
  return tone === "amber" ? "text-vx-amber" : tone === "green" ? "text-vx-green" : tone === "red" ? "text-vx-red" : "text-vx-blue";
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "red" | "blue" }) {
  return (
    <div className="rounded-xl border border-vx-divider bg-white/[0.02] p-4">
      <div className="text-xs uppercase tracking-signal text-vx-textMuted">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}

export function PreviewCard(props: {
  entity: string;
  score: number;
  trend: string;
  consistency: string;
  variance: string;
  confidence: string;
  flags: string[];
  insights: string[];
  cta: string;
  footer: string;
}) {
  const { entity, score, trend, consistency, variance, confidence, flags, insights, cta, footer } = props;
  return (
    <Card className="relative overflow-hidden p-5 md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-vx-amber/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-vx-blue/10 blur-3xl" />
      </div>
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-signal text-vx-textMuted">Entity</div>
            <div className="mt-2 text-lg font-medium text-vx-text">{entity}</div>
          </div>
          <SignalBadge label="Live Logic" tone="blue" />
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-vx-amber/20 bg-vx-amber/10 p-5">
            <div className="text-xs uppercase tracking-signal text-vx-amber">Integrity Score</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-5xl font-semibold text-vx-text md:text-6xl">{score}</div>
              <div className="mb-2 text-sm font-medium text-vx-green">{trend} trend</div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/8">
              <div className="h-2 rounded-full bg-vx-integrity-gradient" style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Confidence" value={confidence} tone="amber" />
            <Metric label="Consistency" value={consistency} tone="green" />
            <Metric label="Variance" value={variance} tone="red" />
            <Metric label="Signal Trend" value={trend} tone="blue" />
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-semibold text-vx-text">Flags</div>
            <ul className="space-y-3">{flags.map((item) => <li key={item} className="rounded-xl border border-vx-divider bg-white/[0.02] p-4 text-sm leading-6 text-white/72">{item}</li>)}</ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-vx-text">Insights</div>
            <ul className="space-y-3">{insights.map((item) => <li key={item} className="rounded-xl border border-vx-divider bg-white/[0.02] p-4 text-sm leading-6 text-white/72">{item}</li>)}</ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4 border-t border-vx-divider pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/50">{footer}</div>
          <Button href="#early-access">{cta}</Button>
        </div>
      </div>
    </Card>
  );
}
