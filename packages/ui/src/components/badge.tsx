import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-bg text-neutral-fg border-neutral-border",
        accent: "bg-accent-subtle-bg text-accent-subtle-text border-accent-subtle-border",
        success: "bg-success-bg text-success-fg border-success-border",
        warning: "bg-warning-bg text-warning-fg border-warning-border",
        danger: "bg-danger-bg text-danger-fg border-danger-border",
        info: "bg-info-bg text-info-fg border-info-border",
        outline: "bg-transparent text-text-secondary border-border-default",
      },
      size: {
        sm: "h-5 px-2 text-2xs [&_svg]:h-3 [&_svg]:w-3",
        md: "h-6 px-2.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, icon, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {icon}
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";
