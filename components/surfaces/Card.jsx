import * as React from "react";

const css = `
.as-card{border-radius:var(--radius-xl);border:1px solid var(--border-default);background:var(--surface-1);color:var(--text-primary);box-shadow:var(--shadow-xs);box-sizing:border-box}
.as-card--elevated{border-color:var(--border-subtle);box-shadow:var(--shadow-md)}
.as-card--flat{border-color:var(--border-subtle);box-shadow:none}
.as-card--inset{border-color:var(--border-subtle);background:var(--surface-2);box-shadow:none}
.as-card--interactive{transition:border-color .15s;cursor:pointer}
.as-card--interactive:hover{border-color:var(--border-strong)}
.as-card__header{display:flex;flex-direction:column;gap:4px;padding:20px}
.as-card__title{margin:0;font-size:var(--text-md);line-height:1.25;font-weight:600}
.as-card__desc{margin:0;font-size:var(--text-sm);line-height:var(--leading-sm);color:var(--text-secondary)}
.as-card__content{padding:0 20px 20px}
.as-card__footer{display:flex;align-items:center;gap:12px;border-top:1px solid var(--border-subtle);padding:20px}
`;
function ensureCss() {
  if (typeof document !== "undefined" && !document.getElementById("as-css-card")) {
    const s = document.createElement("style"); s.id = "as-css-card"; s.textContent = css; document.head.appendChild(s);
  }
}

/** Surface card — recreation of packages/ui card.tsx (default/elevated/flat/inset, interactive). */
export const Card = React.forwardRef(function Card({ variant = "default", interactive = false, className = "", ...props }, ref) {
  ensureCss();
  const cls = ["as-card", variant !== "default" && `as-card--${variant}`, interactive && "as-card--interactive", className].filter(Boolean).join(" ");
  return <div ref={ref} className={cls} {...props} />;
});
export const CardHeader = React.forwardRef(function CardHeader({ className = "", ...props }, ref) {
  return <div ref={ref} className={`as-card__header ${className}`.trim()} {...props} />;
});
export const CardTitle = React.forwardRef(function CardTitle({ className = "", ...props }, ref) {
  return <h3 ref={ref} className={`as-card__title ${className}`.trim()} {...props} />;
});
export const CardDescription = React.forwardRef(function CardDescription({ className = "", ...props }, ref) {
  return <p ref={ref} className={`as-card__desc ${className}`.trim()} {...props} />;
});
export const CardContent = React.forwardRef(function CardContent({ className = "", ...props }, ref) {
  return <div ref={ref} className={`as-card__content ${className}`.trim()} {...props} />;
});
export const CardFooter = React.forwardRef(function CardFooter({ className = "", ...props }, ref) {
  return <div ref={ref} className={`as-card__footer ${className}`.trim()} {...props} />;
});
