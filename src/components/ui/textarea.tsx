import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-none rounded-lg bg-elevated px-4 py-3 text-base leading-normal text-fg shadow-[var(--shadow-card)]",
        "placeholder:text-subtle outline-none transition-shadow duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent/50",
        className,
      )}
      {...props}
    />
  );
}
