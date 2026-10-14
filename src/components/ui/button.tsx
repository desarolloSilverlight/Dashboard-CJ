import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary:
    "border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] hover:bg-[var(--color-cj-chip)] text-[var(--color-cj-text)]",
  ghost: "text-[var(--color-cj-muted)] hover:text-[var(--color-cj-text)] hover:bg-[var(--color-cj-chip)]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
