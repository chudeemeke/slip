import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <div
      className={cn("absolute inset-0 z-30", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Dismiss"
        className={cn(
          "absolute inset-0 bg-bg/80 transition-opacity duration-200 ease-[var(--ease-snappy)]",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col rounded-t-xl bg-surface shadow-[var(--shadow-lift)]",
          "transition-transform duration-300 ease-[var(--ease-out)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        {children}
      </div>
    </div>
  );
}
