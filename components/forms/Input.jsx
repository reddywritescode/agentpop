import * as React from "react";

const css = `
.as-field{display:flex;height:36px;width:100%;align-items:center;gap:8px;border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-1);padding:0 12px;font-family:var(--font-sans);font-size:var(--text-base);line-height:var(--leading-base);color:var(--text-primary);transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
.as-field:focus-within{box-shadow:0 0 0 1px var(--surface-canvas),0 0 0 3px var(--ring)}
.as-field--invalid{border-color:var(--danger-solid)}
.as-field--invalid:focus-within{box-shadow:0 0 0 1px var(--surface-canvas),0 0 0 3px var(--danger-solid)}
.as-field--disabled{opacity:.6;background:var(--surface-2);cursor:not-allowed}
.as-field__control{min-width:0;flex:1;background:transparent;border:none;outline:none;font:inherit;color:inherit;padding:0}
.as-field__control::placeholder{color:var(--text-tertiary)}
.as-field__control:disabled{cursor:not-allowed}
.as-field--mono .as-field__control{font-family:var(--font-mono);font-size:var(--text-sm)}
.as-field__adorn{display:flex;flex-shrink:0;align-items:center;color:var(--text-tertiary)}
.as-field__adorn svg{height:16px;width:16px}
.as-textarea{display:block;min-height:80px;width:100%;border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-1);padding:8px 12px;font-family:var(--font-sans);font-size:var(--text-base);line-height:var(--leading-base);color:var(--text-primary);outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;resize:vertical}
.as-textarea::placeholder{color:var(--text-tertiary)}
.as-textarea:focus-visible{outline:none;box-shadow:0 0 0 1px var(--surface-canvas),0 0 0 3px var(--ring)}
.as-textarea--invalid{border-color:var(--danger-solid)}
.as-textarea--invalid:focus-visible{box-shadow:0 0 0 1px var(--surface-canvas),0 0 0 3px var(--danger-solid)}
.as-textarea--mono{font-family:var(--font-mono);font-size:var(--text-sm)}
.as-textarea:disabled{cursor:not-allowed;opacity:.6;background:var(--surface-2)}
`;
function ensureCss() {
  if (typeof document !== "undefined" && !document.getElementById("as-css-input")) {
    const s = document.createElement("style"); s.id = "as-css-input"; s.textContent = css; document.head.appendChild(s);
  }
}

/** Text field — recreation of packages/ui input.tsx (adornments, invalid, mono, disabled). */
export const Input = React.forwardRef(function Input({ className = "", invalid, leading, trailing, mono, disabled, style, ...props }, ref) {
  ensureCss();
  const cls = ["as-field", invalid && "as-field--invalid", disabled && "as-field--disabled", mono && "as-field--mono", className].filter(Boolean).join(" ");
  return (
    <div className={cls} style={style}>
      {leading ? <span className="as-field__adorn">{leading}</span> : null}
      <input ref={ref} className="as-field__control" disabled={disabled} aria-invalid={invalid || undefined} {...props} />
      {trailing ? <span className="as-field__adorn">{trailing}</span> : null}
    </div>
  );
});
