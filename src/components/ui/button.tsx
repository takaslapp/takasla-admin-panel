import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:opacity-90",
        accent: "bg-accent text-accent-fg hover:opacity-90",
        ghost: "bg-card text-forest border border-line hover:bg-shell",
        pill: "bg-card/90 text-forest hover:bg-card",
        dark: "bg-forest text-accent hover:opacity-90",
        outline: "bg-transparent text-ink border border-line hover:bg-shell/80",
        destructive: "bg-bad text-white hover:bg-bad/90",
        primary: "bg-forest text-card hover:bg-forest/90",
        secondary: "bg-card text-ink border border-line hover:bg-shell",
        "danger-outline": "bg-card text-bad border border-bad/30 hover:bg-bad-soft",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-xs",
        md: "h-10 px-4 text-sm",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
