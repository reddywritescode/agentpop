import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active shadow-xs",
        secondary:
          "bg-surface-1 text-text-primary border border-border-default hover:bg-surface-2 active:bg-surface-3 shadow-xs",
        outline:
          "bg-transparent text-text-primary border border-border-default hover:bg-surface-2 active:bg-surface-3",
        ghost: "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary active:bg-surface-3",
        danger: "bg-danger-solid text-white hover:bg-danger-hover active:bg-danger-hover shadow-xs",
        "danger-outline":
          "bg-transparent text-danger-fg border border-danger-border hover:bg-danger-bg active:bg-danger-bg",
        link: "bg-transparent text-accent-text hover:underline underline-offset-4 p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-base",
        lg: "h-11 px-5 text-md",
        "icon-sm": "h-8 w-8 p-0",
        icon: "h-9 w-9 p-0",
        "icon-lg": "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, leadingIcon, trailingIcon, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          leadingIcon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{leadingIcon}</span>
        )}
        {children}
        {!loading && trailingIcon && (
          <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{trailingIcon}</span>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
