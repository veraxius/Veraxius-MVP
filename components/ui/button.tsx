import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  children,
  href = "#",
  variant = "primary",
  className
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const variantClasses =
    variant === "primary"
      ? "bg-vx-amber text-vx-bg hover:bg-vx-amberHover shadow-vx-amber"
      : variant === "secondary"
      ? "border border-white/14 bg-transparent text-vx-text hover:bg-white/5"
      : "text-white/70 hover:bg-white/5 hover:text-vx-text";

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200", variantClasses, className)}
    >
      {children}
    </Link>
  );
}
