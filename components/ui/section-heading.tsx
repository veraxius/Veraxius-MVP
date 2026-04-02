import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered ? "mx-auto max-w-4xl text-center" : "max-w-3xl")}>
      {eyebrow ? <div className="vx-eyebrow mb-4">{eyebrow}</div> : null}
      <h2 className="vx-h2 text-vx-text">{title}</h2>
      {body ? <p className="vx-body mt-5">{body}</p> : null}
    </div>
  );
}
