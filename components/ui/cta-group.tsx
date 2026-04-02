import { Button } from "./button";

export function CTAGroup({
  primaryLabel,
  secondaryLabel
}: {
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="#early-access">{primaryLabel}</Button>
      <Button href="#how-it-works" variant="secondary">{secondaryLabel}</Button>
    </div>
  );
}
