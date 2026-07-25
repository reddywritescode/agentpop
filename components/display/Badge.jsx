import * as React from "react";

const css = `
.as-badge{display:inline-flex;align-items:center;gap:6px;border-radius:var(--radius-pill);border:1px solid;font-family:var(--font-sans);font-weight:500;white-space:nowrap;box-sizing:border-box}
.as-badge svg{flex-shrink:0}
.as-badge--sm{height:20px;padding:0 8px;font-size:var(--text-2xs);line-height:var(--leading-2xs)}
.as-badge--sm svg{height:12px;width:12px}
.as-badge--md{height:24px;padding:0 10px;font-size:var(--text-xs);line-height:var(--leading-xs)}
.as-badge--md svg{height:14px;width:14px}
.as-badge--neutral{background:var(--neutral-bg);color:var(--neutral-fg);border-color:var(--neutral-border)}
.as-badge--accent{background:var(--accent-subtle-bg);color:var(--accent-subtle-text);border-color:var(--accent-subtle-border)}
.as-badge--success{background:var(--success-bg);color:var(--success-fg);border-color:var(--success-border)}
.as-badge--warning{background:var(--warning-bg);color:var(--warning-fg);border-color:var(--warning-border)}
.as-badge--danger{background:var(--danger-bg);color:var(--danger-fg);border-color:var(--danger-border)}
.as-badge--info{background:var(--info-bg);color:var(--info-fg);border-color:var(--info-border)}
.as-badge--outline{background:transparent;color:var(--text-secondary);border-color:var(--border-default)}
`;
function ensureCss() {
  if (typeof document !== "undefined" && !document.getElementById("as-css-badge")) {
    const s = document.createElement("style"); s.id = "as-css-badge"; s.textContent = css; document.head.appendChild(s);
  }
}

/** Pill badge — recreation of packages/ui badge.tsx (7 tones × 2 sizes, optional icon). */
export const Badge = React.forwardRef(function Badge({ tone = "neutral", size = "md", icon, className = "", children, ...props }, ref) {
  ensureCss();
  return (
    <span ref={ref} className={`as-badge as-badge--${tone} as-badge--${size} ${className}`.trim()} {...props}>
      {icon}
      {children}
    </span>
  );
});
