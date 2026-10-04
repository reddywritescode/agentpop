import * as React from "react";
import { Icon } from "../icons/Icon";

const css = `
.as-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;border-radius:var(--radius-lg);font-family:var(--font-sans);font-weight:500;border:1px solid transparent;cursor:pointer;user-select:none;transition:background-color .15s,border-color .15s,color .15s;outline:none;box-sizing:border-box}
.as-btn:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.as-btn:disabled{pointer-events:none;opacity:.5}
.as-btn--sm{height:32px;padding:0 12px;font-size:var(--text-xs);line-height:var(--leading-xs)}
.as-btn--md{height:36px;padding:0 16px;font-size:var(--text-base);line-height:var(--leading-base)}
.as-btn--lg{height:44px;padding:0 20px;font-size:var(--text-md);line-height:var(--leading-md)}
.as-btn--icon-sm{height:32px;width:32px;padding:0}
.as-btn--icon{height:36px;width:36px;padding:0}
.as-btn--icon-lg{height:44px;width:44px;padding:0}
.as-btn--primary{background:var(--accent);color:var(--accent-fg);box-shadow:var(--shadow-xs)}
.as-btn--primary:hover{background:var(--accent-hover)}
.as-btn--primary:active{background:var(--accent-active)}
.as-btn--secondary{background:var(--surface-1);color:var(--text-primary);border-color:var(--border-default);box-shadow:var(--shadow-xs)}
.as-btn--secondary:hover{background:var(--surface-2)}
.as-btn--secondary:active{background:var(--surface-3)}
.as-btn--outline{background:transparent;color:var(--text-primary);border-color:var(--border-default)}
.as-btn--outline:hover{background:var(--surface-2)}
.as-btn--outline:active{background:var(--surface-3)}
.as-btn--ghost{background:transparent;color:var(--text-secondary)}
.as-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}
.as-btn--ghost:active{background:var(--surface-3)}
.as-btn--danger{background:var(--danger-solid);color:#fff;box-shadow:var(--shadow-xs)}
.as-btn--danger:hover,.as-btn--danger:active{background:var(--danger-hover)}
.as-btn--danger-outline{background:transparent;color:var(--danger-fg);border-color:var(--danger-border)}
.as-btn--danger-outline:hover,.as-btn--danger-outline:active{background:var(--danger-bg)}
.as-btn--link{background:transparent;color:var(--accent-text);padding:0;height:auto;border:none;box-shadow:none}
.as-btn--link:hover{text-decoration:underline;text-underline-offset:4px}
.as-btn__icon{display:inline-flex;flex-shrink:0}
.as-btn__icon svg{height:16px;width:16px}
`;
function ensureCss() {
  if (typeof document !== "undefined" && !document.getElementById("as-css-button")) {
    const s = document.createElement("style"); s.id = "as-css-button"; s.textContent = css; document.head.appendChild(s);
  }
}

/** Action button — recreation of packages/ui button.tsx (variants, sizes, loading, icons). */
export const Button = React.forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, leadingIcon, trailingIcon, className = "", children, disabled, ...props }, ref) {
  ensureCss();
  return (
    <button ref={ref} className={`as-btn as-btn--${variant} as-btn--${size} ${className}`.trim()}
      disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Icon name="loader-circle" size={16} spin /> : leadingIcon ? <span className="as-btn__icon">{leadingIcon}</span> : null}
      {children}
      {!loading && trailingIcon ? <span className="as-btn__icon">{trailingIcon}</span> : null}
    </button>
  );
});
