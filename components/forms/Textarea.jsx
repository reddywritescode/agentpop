import * as React from "react";
import "./Input"; // ensures the shared field stylesheet is registered

/** Multi-line field — recreation of the Textarea in packages/ui input.tsx. */
export const Textarea = React.forwardRef(function Textarea({ className = "", invalid, mono, ...props }, ref) {
  const cls = ["as-textarea", invalid && "as-textarea--invalid", mono && "as-textarea--mono", className].filter(Boolean).join(" ");
  return <textarea ref={ref} className={cls} aria-invalid={invalid || undefined} {...props} />;
});
