import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg bg-elevated px-4 text-base text-fg shadow-[var(--shadow-card)]",
        "placeholder:text-subtle outline-none transition-shadow duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent/50",
        className,
      )}
      {...props}
    />
  );
}
