import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,background-color,opacity,color] duration-150 ease-[var(--ease-snappy)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.96]",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:bg-fg/90",
        accent: "bg-accent text-accent-fg hover:bg-accent/90",
        ghost: "bg-transparent text-fg hover:bg-elevated",
        outline: "bg-elevated text-fg shadow-[var(--shadow-card)] hover:bg-card",
        danger: "bg-danger/15 text-danger hover:bg-danger/25",
      },
      size: {
        md: "h-12 rounded-lg px-5 text-[15px]",
        sm: "h-10 rounded-md px-3.5 text-sm",
        icon: "size-11 rounded-lg",
        fab: "size-14 rounded-full shadow-[var(--shadow-lift)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
