import { cn } from "@/lib/utils";

export function SectionShell({
  children,
  id,
  className = ""
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn("vx-section", className)}>
      <div className="vx-container">{children}</div>
    </section>
  );
}
