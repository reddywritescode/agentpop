import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state (also wire aria-invalid via the Field wrapper). */
  invalid?: boolean;
  /** Element rendered inside the field, before the input (e.g. an icon). */
  leading?: React.ReactNode;
  /** Element rendered inside the field, after the input. */
  trailing?: React.ReactNode;
  /** Use a monospace font — for IDs, keys, endpoints, commands. */
  mono?: boolean;
}

const baseField =
  "flex h-9 w-full items-center gap-2 rounded-lg border bg-surface-1 px-3 text-base text-text-primary transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-surface-canvas";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leading, trailing, mono, disabled, ...props }, ref) => {
    const border = invalid ? "border-danger-solid focus-within:ring-danger-solid" : "border-border-default";
    const state = disabled ? "opacity-60 bg-surface-2 cursor-not-allowed" : "";

    const control = (
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed",
          mono && "font-mono text-sm",
        )}
        {...props}
      />
    );

    if (!leading && !trailing) {
      return <div className={cn(baseField, border, state, className)}>{control}</div>;
    }

    return (
      <div className={cn(baseField, border, state, className)}>
        {leading && <span className="flex shrink-0 items-center text-text-tertiary [&_svg]:h-4 [&_svg]:w-4">{leading}</span>}
        {control}
        {trailing && <span className="flex shrink-0 items-center text-text-tertiary [&_svg]:h-4 [&_svg]:w-4">{trailing}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, mono, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-surface-1 px-3 py-2 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-canvas disabled:cursor-not-allowed disabled:opacity-60",
        invalid ? "border-danger-solid focus-visible:ring-danger-solid" : "border-border-default",
        mono && "font-mono text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
