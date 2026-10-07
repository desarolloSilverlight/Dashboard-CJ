import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-[var(--color-cj-border)] bg-[var(--color-cj-bg)] px-3 py-2 text-sm outline-none focus:border-blue-500",
        className,
      )}
      {...props}
    />
  );
}
