import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Convenience list of options; alternatively pass <option> children. */
  options?: SelectOption[];
  invalid?: boolean;
  /** Render with a monospace font (IDs, regions, scopes). */
  mono?: boolean;
  children?: React.ReactNode;
}

const baseField =
  "peer h-9 w-full appearance-none rounded-lg border bg-surface-1 pl-3 pr-8 text-base text-text-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-canvas disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Token-styled native <select> with a trailing chevron. Native by design:
 * accessible, keyboard-complete, and zero-dependency for the dense forms across
 * the dashboard (region, size, scopes, roles, idle policy, …).
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, invalid, mono, children, ...props }, ref) => {
    const border = invalid ? "border-danger-solid focus-visible:ring-danger-solid" : "border-border-default";
    return (
      <div className={cn("relative block", className)}>
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(baseField, border, mono && "font-mono text-sm")}
          {...props}
        >
          {options
            ? options.map((o) => {
                const value = typeof o === "string" ? o : o.value;
                const label = typeof o === "string" ? o : o.label;
                const disabled = typeof o === "string" ? undefined : o.disabled;
                return (
                  <option key={value} value={value} disabled={disabled}>
                    {label}
                  </option>
                );
              })
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
      </div>
    );
  },
);
Select.displayName = "Select";
