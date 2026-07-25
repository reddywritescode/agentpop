/* @ds-bundle: {"format":4,"namespace":"AgentPopDesignSystem_47afa4","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"STATUS_META","sourcePath":"components/display/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/display/StatusBadge.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Icon","sourcePath":"components/icons/Icon.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"CardHeader","sourcePath":"components/surfaces/Card.jsx"},{"name":"CardTitle","sourcePath":"components/surfaces/Card.jsx"},{"name":"CardDescription","sourcePath":"components/surfaces/Card.jsx"},{"name":"CardContent","sourcePath":"components/surfaces/Card.jsx"},{"name":"CardFooter","sourcePath":"components/surfaces/Card.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"3a2cdfb8a361","components/display/Badge.jsx":"fb197028427b","components/display/StatusBadge.jsx":"ad478536d239","components/forms/Input.jsx":"3e29dc0b9285","components/forms/Textarea.jsx":"3aae12101950","components/icons/Icon.jsx":"efa25ed3b45a","components/surfaces/Card.jsx":"fdf0b748c8c1","ui_kits/dashboard/AgentsScreen.jsx":"6a10fc8512ea","ui_kits/dashboard/ConnectorsScreen.jsx":"87ebd416f5f3","ui_kits/dashboard/CreateSandboxSheet.jsx":"1abe43d77410","ui_kits/dashboard/DeveloperScreen.jsx":"cae0648ad2cc","ui_kits/dashboard/OverviewScreen.jsx":"471c416b8d0b","ui_kits/dashboard/ResourceScreens.jsx":"00e44f47ce94","ui_kits/dashboard/SandboxDetailScreen.jsx":"ab75fe822726","ui_kits/dashboard/SandboxesScreen.jsx":"3fc8be5f792b","ui_kits/dashboard/SettingsScreen.jsx":"2545c4ed37ac","ui_kits/dashboard/Shell.jsx":"6adcb0642f74","ui_kits/dashboard/data.js":"24d8a7db1121","ui_kits/dashboard/store.js":"65ad63d0048e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AgentPopDesignSystem_47afa4 = window.AgentPopDesignSystem_47afa4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    const s = document.createElement("style");
    s.id = "as-css-badge";
    s.textContent = css;
    document.head.appendChild(s);
  }
}

/** Pill badge — recreation of packages/ui badge.tsx (7 tones × 2 sizes, optional icon). */
const Badge = React.forwardRef(function Badge({
  tone = "neutral",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}, ref) {
  ensureCss();
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    className: `as-badge as-badge--${tone} as-badge--${size} ${className}`.trim()
  }, props), icon, children);
});
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    const s = document.createElement("style");
    s.id = "as-css-input";
    s.textContent = css;
    document.head.appendChild(s);
  }
}

/** Text field — recreation of packages/ui input.tsx (adornments, invalid, mono, disabled). */
const Input = React.forwardRef(function Input({
  className = "",
  invalid,
  leading,
  trailing,
  mono,
  disabled,
  style,
  ...props
}, ref) {
  ensureCss();
  const cls = ["as-field", invalid && "as-field--invalid", disabled && "as-field--disabled", mono && "as-field--mono", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: style
  }, leading ? /*#__PURE__*/React.createElement("span", {
    className: "as-field__adorn"
  }, leading) : null, /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    className: "as-field__control",
    disabled: disabled,
    "aria-invalid": invalid || undefined
  }, props)), trailing ? /*#__PURE__*/React.createElement("span", {
    className: "as-field__adorn"
  }, trailing) : null);
});
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ensures the shared field stylesheet is registered

/** Multi-line field — recreation of the Textarea in packages/ui input.tsx. */
const Textarea = React.forwardRef(function Textarea({
  className = "",
  invalid,
  mono,
  ...props
}, ref) {
  const cls = ["as-textarea", invalid && "as-textarea--invalid", mono && "as-textarea--mono", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("textarea", _extends({
    ref: ref,
    className: cls,
    "aria-invalid": invalid || undefined
  }, props));
});
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/icons/Icon.jsx
try { (() => {
const SVG_DEFAULTS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function pascal(name) {
  return String(name).split(/[-_ ]/).map(s => s ? s[0].toUpperCase() + s.slice(1) : "").join("");
}
function toReactAttrs(attrs) {
  const out = {};
  for (const k in attrs) {
    out[k === "class" ? "className" : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attrs[k];
  }
  return out;
}

/**
 * Lucide icon wrapper. Requires the lucide UMD build on the page:
 * <script src="https://unpkg.com/lucide@0.462.0/dist/umd/lucide.min.js"></script>
 * Renders a 2px-stroke icon by kebab-case name, e.g. <Icon name="circle-check" />.
 */
function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  spin = false,
  className = "",
  style,
  ...props
}) {
  const lucide = typeof window !== "undefined" ? window.lucide : null;
  const source = lucide ? lucide.icons || lucide : null;
  const node = source ? source[pascal(name)] || source[name] : null;
  // lucide ships two array shapes: a bare child list [["path",{...}],...] and a wrapped
  // element tuple ["svg", {attrs}, [children]] — unwrap the latter.
  const kids = Array.isArray(node) && typeof node[0] === "string" && Array.isArray(node[2]) ? node[2] : node;
  const children = Array.isArray(kids) ? kids.map((child, i) => {
    const [tag, attrs] = Array.isArray(child) ? child : [child.tag, child.attrs];
    return React.createElement(tag, {
      ...toReactAttrs(attrs || {}),
      key: i
    });
  }) : null;
  return React.createElement("svg", {
    ...SVG_DEFAULTS,
    width: size,
    height: size,
    strokeWidth,
    "aria-hidden": true,
    className: ("as-icon " + (spin ? "as-icon--spin " : "") + className).trim(),
    style,
    ...props
  }, children);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/Icon.jsx", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    const s = document.createElement("style");
    s.id = "as-css-button";
    s.textContent = css;
    document.head.appendChild(s);
  }
}

/** Action button — recreation of packages/ui button.tsx (variants, sizes, loading, icons). */
const Button = React.forwardRef(function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  className = "",
  children,
  disabled,
  ...props
}, ref) {
  ensureCss();
  return /*#__PURE__*/React.createElement("button", _extends({
    ref: ref,
    className: `as-btn as-btn--${variant} as-btn--${size} ${className}`.trim(),
    disabled: disabled || loading,
    "aria-busy": loading || undefined
  }, props), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    size: 16,
    spin: true
  }) : leadingIcon ? /*#__PURE__*/React.createElement("span", {
    className: "as-btn__icon"
  }, leadingIcon) : null, children, !loading && trailingIcon ? /*#__PURE__*/React.createElement("span", {
    className: "as-btn__icon"
  }, trailingIcon) : null);
});
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Status metadata — recreation of packages/ui status-badge.tsx STATUS_META. */
const STATUS_META = {
  queued: {
    label: "Queued",
    tone: "neutral",
    icon: "circle-dashed"
  },
  provisioning: {
    label: "Provisioning",
    tone: "info",
    icon: "loader",
    spin: true
  },
  running: {
    label: "Running",
    tone: "success",
    icon: "circle-dot"
  },
  active: {
    label: "Active",
    tone: "success",
    icon: "circle-dot"
  },
  healthy: {
    label: "Healthy",
    tone: "success",
    icon: "circle-check"
  },
  pausing: {
    label: "Pausing",
    tone: "warning",
    icon: "loader",
    spin: true
  },
  paused: {
    label: "Paused",
    tone: "warning",
    icon: "circle-pause"
  },
  resuming: {
    label: "Resuming",
    tone: "info",
    icon: "loader",
    spin: true
  },
  deploying: {
    label: "Deploying",
    tone: "info",
    icon: "loader",
    spin: true
  },
  stopped: {
    label: "Stopped",
    tone: "neutral",
    icon: "ban"
  },
  inactive: {
    label: "Inactive",
    tone: "neutral",
    icon: "ban"
  },
  deleting: {
    label: "Deleting",
    tone: "danger",
    icon: "trash-2"
  },
  deleted: {
    label: "Deleted",
    tone: "neutral",
    icon: "circle-x"
  },
  degraded: {
    label: "Degraded",
    tone: "warning",
    icon: "circle-dashed"
  },
  failed: {
    label: "Failed",
    tone: "danger",
    icon: "circle-x"
  },
  error: {
    label: "Error",
    tone: "danger",
    icon: "circle-x"
  }
};

/**
 * Lifecycle status pill. Communicates state with icon + text + tone — never color alone —
 * for sandboxes, agents, and health indicators.
 */
const StatusBadge = React.forwardRef(function StatusBadge({
  status,
  label,
  size = "md",
  ...props
}, ref) {
  const meta = STATUS_META[status] || STATUS_META.error;
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, _extends({
    ref: ref,
    tone: meta.tone,
    size: size,
    icon: /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: meta.icon,
      size: size === "sm" ? 12 : 14,
      spin: meta.spin
    })
  }, props), label != null ? label : meta.label);
});
Object.assign(__ds_scope, { STATUS_META, StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    const s = document.createElement("style");
    s.id = "as-css-card";
    s.textContent = css;
    document.head.appendChild(s);
  }
}

/** Surface card — recreation of packages/ui card.tsx (default/elevated/flat/inset, interactive). */
const Card = React.forwardRef(function Card({
  variant = "default",
  interactive = false,
  className = "",
  ...props
}, ref) {
  ensureCss();
  const cls = ["as-card", variant !== "default" && `as-card--${variant}`, interactive && "as-card--interactive", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    className: cls
  }, props));
});
const CardHeader = React.forwardRef(function CardHeader({
  className = "",
  ...props
}, ref) {
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    className: `as-card__header ${className}`.trim()
  }, props));
});
const CardTitle = React.forwardRef(function CardTitle({
  className = "",
  ...props
}, ref) {
  return /*#__PURE__*/React.createElement("h3", _extends({
    ref: ref,
    className: `as-card__title ${className}`.trim()
  }, props));
});
const CardDescription = React.forwardRef(function CardDescription({
  className = "",
  ...props
}, ref) {
  return /*#__PURE__*/React.createElement("p", _extends({
    ref: ref,
    className: `as-card__desc ${className}`.trim()
  }, props));
});
const CardContent = React.forwardRef(function CardContent({
  className = "",
  ...props
}, ref) {
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    className: `as-card__content ${className}`.trim()
  }, props));
});
const CardFooter = React.forwardRef(function CardFooter({
  className = "",
  ...props
}, ref) {
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    className: `as-card__footer ${className}`.trim()
  }, props));
});
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/AgentsScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  StatusBadge,
  Badge
} = window.AgentPopDesignSystem_47afa4;
function DeployAgentSheet({
  onClose,
  onDeploy
}) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState(d.sizes[2].id);
  const [model, setModel] = React.useState("claude-sonnet-4-5");
  const [conns, setConns] = React.useState(["GitHub"]);
  const [deploying, setDeploying] = React.useState(false);
  const toggle = c => setConns(conns.includes(c) ? conns.filter(x => x !== c) : [...conns, c]);
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "Deploy agent",
    desc: "A declarative profile over a long-running sandbox.",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "est"
    }, /*#__PURE__*/React.createElement("b", null, size), " \xB7 restart on failure"), /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      loading: deploying,
      onClick: () => {
        setDeploying(true);
        const s = d.sizes.find(x => x.id === size);
        setTimeout(() => onDeploy({
          name: name || "my-agent",
          model,
          size: s.cpu + " · " + s.ram,
          connectors: conns
        }), 900);
      }
    }, deploying ? "Deploying…" : "Deploy agent"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    help: "Lowercase letters, digits, hyphens. Max 22 chars."
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "issue-triage",
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Agent template"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["openclaw-compatible", "custom image…"],
    defaultValue: "openclaw-compatible"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Model"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["Anthropic", "OpenAI"],
    defaultValue: "Anthropic"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.4
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["claude-sonnet-4-5", "claude-haiku-4-5"],
    value: model,
    onChange: e => setModel(e.target.value)
  })))), /*#__PURE__*/React.createElement(Field, {
    label: "Model secret",
    help: "A secret reference \u2014 the raw key is never injected into the VM."
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["secret/anthropic-prod", "secret/anthropic-dev"],
    defaultValue: "secret/anthropic-prod"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Command",
    optional: true
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "node agent.js --channel ops"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Resources"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sizegrid"
  }, d.sizes.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "sizecard" + (size === s.id ? " sel" : ""),
    onClick: () => setSize(s.id),
    role: "radio",
    "aria-checked": size === s.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, s.id), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", null, s.cpu), /*#__PURE__*/React.createElement("span", null, s.ram)))))), /*#__PURE__*/React.createElement(Field, {
    label: "Restart policy"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["on failure", "always", "never"],
    defaultValue: "on failure"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Connector grants",
    help: "Agents receive scoped grants, not your OAuth credentials."
  }, d.connectors.filter(c => c.connected).map(c => /*#__PURE__*/React.createElement("div", {
    className: "kv",
    key: c.name
  }, /*#__PURE__*/React.createElement(Check, {
    on: conns.includes(c.name),
    onChange: () => toggle(c.name),
    label: c.name
  }), /*#__PURE__*/React.createElement(Icon, {
    name: c.icon,
    size: 15,
    style: {
      color: "var(--text-secondary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "13px/18px var(--font-sans)"
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "outline",
    size: "sm"
  }, c.account)))));
}
function AgentsScreen({
  param
}) {
  const st = useStore();
  const list = st.agents;
  const [tab, setTab] = React.useState("agents");
  const [sheet, setSheet] = React.useState(!!(param && param.deploy));
  const [logs, setLogs] = React.useState(null);
  const onDeploy = o => {
    ASXActions.deployAgent(o);
    setSheet(false);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Agents",
    desc: "Long-running agents in managed sandboxes with granted connectors."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setSheet(true)
  }, "Deploy agent")), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tab" + (tab === "agents" ? " active" : ""),
    onClick: () => setTab("agents")
  }, "My agents"), /*#__PURE__*/React.createElement("button", {
    className: "tab" + (tab === "templates" ? " active" : ""),
    onClick: () => setTab("templates")
  }, "Templates")), tab === "agents" ? list.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "bot",
    title: "No agents deployed",
    desc: "Deploy an agent to run long-lived work in a sandbox with scoped connector access."
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setSheet(true)
  }, "Deploy agent")) : /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, list.map(a => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: a.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bot",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, a.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, a.template), /*#__PURE__*/React.createElement("span", null, a.model), st.sandboxes.some(s => s.id === a.sandbox) ? /*#__PURE__*/React.createElement("button", {
    className: "linkbtn",
    style: {
      font: "12px/16px var(--font-mono)"
    },
    title: "Open sandbox",
    onClick: () => window.AGENTPOP_DESIGNNav("sandbox", {
      id: a.sandbox
    })
  }, a.sandbox.slice(0, 14), "\u2026") : /*#__PURE__*/React.createElement("span", null, a.sandbox.slice(0, 14), "\u2026"))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), a.connectors.map(c => /*#__PURE__*/React.createElement(Badge, {
    key: c,
    tone: "outline",
    size: "sm"
  }, c)), /*#__PURE__*/React.createElement(StatusBadge, {
    status: a.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, a.age), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Logs",
    title: "Logs",
    onClick: () => setLogs(a)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "scroll-text",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Restart",
    title: "Restart",
    onClick: () => ASXActions.restartAgent(a.name)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh-cw",
    size: 15
  })), a.status === "stopped" ? /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Start",
    title: "Start",
    onClick: () => ASXActions.restartAgent(a.name)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 15
  })) : /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Stop",
    title: "Stop",
    onClick: () => ASXActions.stopAgent(a.name)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ban",
    size: 15
  }))))))) : /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, "openclaw-compatible"), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, "reference agent template"), /*#__PURE__*/React.createElement("span", null, "framework-neutral"))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    size: "sm"
  }, "v1"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    onClick: () => {
      setTab("agents");
      setSheet(true);
    }
  }, "Use template")))), sheet ? /*#__PURE__*/React.createElement(DeployAgentSheet, {
    onClose: () => setSheet(false),
    onDeploy: onDeploy
  }) : null, logs ? /*#__PURE__*/React.createElement(Modal, {
    title: logs.name + " — logs",
    desc: "Streamed over SSE from the agent sandbox.",
    width: 640,
    onClose: () => setLogs(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setLogs(null)
    }, "Close"))
  }, /*#__PURE__*/React.createElement(CodeBlock, {
    lines: window.AGENTPOP_DESIGN.agentLogs
  })) : null);
}
Object.assign(window, {
  AgentsScreen,
  DeployAgentSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/AgentsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ConnectorsScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  StatusBadge,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} = window.AgentPopDesignSystem_47afa4;
function ConnectorCard({
  c,
  onConnect
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.icon,
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(CardTitle, null, c.name), /*#__PURE__*/React.createElement(CardDescription, null, c.desc)), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), c.connected ? /*#__PURE__*/React.createElement(StatusBadge, {
    status: "healthy",
    size: "sm"
  }) : null)), /*#__PURE__*/React.createElement(CardContent, null, c.connected ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "outline",
    size: "sm"
  }, c.account), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    size: "sm"
  }, c.grants, " grant", c.grants === 1 ? "" : "s")) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, "Not connected")), /*#__PURE__*/React.createElement(CardFooter, null, c.connected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Edit grants"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost"
  }, "Reconnect"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "danger-outline"
  }, "Revoke")) : /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => onConnect(c.name),
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plug"
    })
  }, "Connect")));
}
function ConnectorsScreen() {
  const [list, setList] = React.useState(window.AGENTPOP_DESIGN.connectors);
  const onConnect = name => setList(ls => ls.map(c => c.name === name ? {
    ...c,
    connected: true,
    account: "sam@acmelabs.dev",
    grants: 0
  } : c));
  const connected = list.filter(c => c.connected),
    available = list.filter(c => !c.connected);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Connectors",
    desc: "Centrally governed credentials and tools for your agents."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grantnote"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 16,
    style: {
      flexShrink: 0,
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, "Agents receive scoped, expiring grants through the connector broker. Provider OAuth tokens never enter a sandbox, and every invocation lands in the audit log.")), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "600 15px/22px var(--font-sans)",
      margin: "0 0 10px"
    }
  }, "Connected"), /*#__PURE__*/React.createElement("div", {
    className: "conngrid",
    style: {
      marginBottom: 24
    }
  }, connected.map(c => /*#__PURE__*/React.createElement(ConnectorCard, {
    key: c.name,
    c: c,
    onConnect: onConnect
  }))), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "600 15px/22px var(--font-sans)",
      margin: "0 0 10px"
    }
  }, "Available"), available.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "plug",
    title: "Everything is connected",
    desc: "GitHub, Slack, Gmail, and Google Drive are the launch catalog."
  }) : /*#__PURE__*/React.createElement("div", {
    className: "conngrid"
  }, available.map(c => /*#__PURE__*/React.createElement(ConnectorCard, {
    key: c.name,
    c: c,
    onConnect: onConnect
  }))));
}
Object.assign(window, {
  ConnectorsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ConnectorsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/CreateSandboxSheet.jsx
try { (() => {
const {
  Button,
  Icon,
  Input
} = window.AgentPopDesignSystem_47afa4;
function CreateSandboxSheet({
  onClose,
  onCreate
}) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState(d.sizes[2].id);
  const [preview, setPreview] = React.useState(true);
  const [previewMode, setPreviewMode] = React.useState("public");
  const [idle, setIdle] = React.useState(false);
  const [idleAfter, setIdleAfter] = React.useState("after 15 min");
  const [image, setImage] = React.useState("devbox:1");
  const [disk, setDisk] = React.useState("10 GB");
  const [envs, setEnvs] = React.useState([{
    k: "",
    v: ""
  }]);
  const [creating, setCreating] = React.useState(false);
  const invalid = name !== "" && !/^[a-z0-9-]{1,22}$/.test(name);
  const create = () => {
    if (invalid) return;
    setCreating(true);
    const s = d.sizes.find(x => x.id === size);
    setTimeout(() => {
      onCreate({
        name: name || "sandbox-" + Math.random().toString(36).slice(2, 7),
        size: s.cpu + " · " + s.ram,
        template: image,
        disk,
        idle: idle ? "pause " + idleAfter : "no idle pause"
      });
    }, 900);
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "Create sandbox",
    desc: "An isolated Firecracker microVM.",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "est"
    }, /*#__PURE__*/React.createElement("b", null, "0.0023 cr/sec"), " \xB7 8.284 cr/hr estimated", /*#__PURE__*/React.createElement("br", null), size, " \xB7 10 GB disk"), /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      loading: creating,
      onClick: create
    }, creating ? "Creating…" : "Create sandbox"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    optional: true,
    help: invalid ? "Only lowercase letters, digits, and hyphens." : "Lowercase letters, digits, hyphens. Max 22 chars.",
    error: invalid
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "my-sandbox",
    value: name,
    invalid: invalid,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Region"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["us-east", "eu-central"],
    defaultValue: "us-east"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Size"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sizegrid"
  }, d.sizes.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "sizecard" + (size === s.id ? " sel" : ""),
    onClick: () => setSize(s.id),
    role: "radio",
    "aria-checked": size === s.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, s.id), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 13
  }), s.cpu), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "memory-stick",
    size: 13
  }), s.ram)))))), /*#__PURE__*/React.createElement(Field, {
    label: "Image"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["devbox:1", "python-ml:3", "node-lts:2", "custom-cuda:1"],
    value: image,
    onChange: e => setImage(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Disk"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["5 GB", "10 GB", "20 GB", "40 GB"],
    value: disk,
    onChange: e => setDisk(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "optrow"
  }, /*#__PURE__*/React.createElement(Check, {
    on: preview,
    onChange: setPreview,
    label: "Public preview"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Public preview URL"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "Expose ports over HTTPS so apps inside are reachable from anywhere."), preview ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, ["public", "organization", "signed-link"].map(m => /*#__PURE__*/React.createElement(Button, {
    key: m,
    size: "sm",
    variant: previewMode === m ? "primary" : "outline",
    onClick: () => setPreviewMode(m)
  }, m))) : null)), /*#__PURE__*/React.createElement("div", {
    className: "optrow"
  }, /*#__PURE__*/React.createElement(Check, {
    on: idle,
    onChange: setIdle,
    label: "Pause when idle"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Pause when idle"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "Stop the sandbox automatically after a stretch with no activity. You can resume it any time."), idle ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      maxWidth: 180
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["after 5 min", "after 15 min", "after 1 h"],
    value: idleAfter,
    onChange: e => setIdleAfter(e.target.value)
  })) : null)), /*#__PURE__*/React.createElement(Field, {
    label: "Allowed egress",
    optional: true,
    help: "Empty = allow everything. Hosts, IPs, CIDRs, domain wildcards."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "pypi.org, github.com:443, 1.1.1.1"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Environment variables",
    optional: true
  }, envs.map((e, i) => /*#__PURE__*/React.createElement("div", {
    className: "kv",
    key: i
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "KEY",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "value",
    style: {
      flex: 1.4
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Remove",
    onClick: () => setEnvs(envs.filter((_, j) => j !== i))
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 14
  })))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setEnvs([...envs, {
      k: "",
      v: ""
    }])
  }, "Add variable")));
}
Object.assign(window, {
  CreateSandboxSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/CreateSandboxSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DeveloperScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} = window.AgentPopDesignSystem_47afa4;
function CreateKeyModal({
  onClose,
  onCreate
}) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState(["sandbox:write"]);
  const toggle = s => setScopes(scopes.includes(s) ? scopes.filter(x => x !== s) : [...scopes, s]);
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Create API key",
    desc: "Scoped to one project. Shown once, hashed at rest.",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => onCreate({
        name: name || "ci-deploys",
        scopes
      })
    }, "Create key"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    help: "What is this key for? e.g. ci-deploys."
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "ci-deploys",
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Project"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["production", "staging"],
    defaultValue: "production"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Expiry"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["30 days", "90 days", "1 year"],
    defaultValue: "90 days"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Scopes"
  }, d.scopes.map(s => /*#__PURE__*/React.createElement("div", {
    className: "kv",
    key: s
  }, /*#__PURE__*/React.createElement(Check, {
    on: scopes.includes(s),
    onChange: () => toggle(s),
    label: s
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13
    }
  }, s)))));
}
function DeveloperScreen() {
  const [mode, setMode] = React.useState("humans");
  const [keys, setKeys] = React.useState([]);
  const [modal, setModal] = React.useState(false);
  const [revealed, setRevealed] = React.useState(null);
  const [sdk, setSdk] = React.useState("TypeScript");
  const [mcp, setMcp] = React.useState("Claude Code");
  const onCreate = ({
    name,
    scopes
  }) => {
    const secret = "pop_" + Math.random().toString(36).slice(2, 10) + "…redacted";
    setKeys(ks => [{
      name,
      scopes,
      created: "just now",
      expires: "in 90 days"
    }, ...ks]);
    setRevealed(secret);
    setModal(false);
  };
  const snippets = {
    TypeScript: ["npm install @agentpop/sdk", "", {
      text: "const agentpop = new AgentPop({ apiKey });",
      cmt: ""
    }, "const sb = await agentpop.sandboxes.create({ size: \"s-1vcpu-2gb\" });", "await sb.exec(\"python train.py\");"],
    Python: ["pip install agentpop", "", "agentpop = AgentPop(api_key=key)", "sb = agentpop.sandboxes.create(size=\"s-1vcpu-2gb\")", "sb.exec(\"python train.py\")"],
    CLI: [{
      text: "brew install agentpop/tap/agentpop",
      cmt: "or curl installer"
    }, "", {
      text: "agentpop login",
      cmt: "sign in via browser"
    }, {
      text: "agentpop sandbox create --size s-1vcpu-2gb",
      cmt: ""
    }, {
      text: "agentpop sandbox exec sb-01ky47 -- python train.py",
      cmt: ""
    }]
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Developer",
    desc: "API keys, SDK quickstarts, the agentpop CLI, and the MCP server."
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg",
    role: "tablist"
  }, /*#__PURE__*/React.createElement("button", {
    className: mode === "humans" ? "active" : "",
    onClick: () => setMode("humans")
  }, "For humans"), /*#__PURE__*/React.createElement("button", {
    className: mode === "agents" ? "active" : "",
    onClick: () => setMode("agents")
  }, "For agents"))), mode === "agents" ? /*#__PURE__*/React.createElement("div", {
    className: "codebl",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "cmt"
  }, "# machine-readable overview for agent consumption \xB7 GET /llms.txt for the full API map")), /*#__PURE__*/React.createElement("div", null, "GET https://api.agentpop.cloud/v1/sandboxes  Authorization: Bearer $ASX_KEY"), /*#__PURE__*/React.createElement("div", null, "POST /v1/sandboxes ", "{", "\"size\":\"s-1vcpu-2gb\",\"image\":\"devbox:1\"", "}", "  Idempotency-Key: uuid"), /*#__PURE__*/React.createElement("div", null, "States: queued\u2192provisioning\u2192running\u2192(pausing\u2194paused)\u2192deleting\u2192deleted | failed"), /*#__PURE__*/React.createElement("div", null, "MCP: npx -y @agentpop/mcp  ", /*#__PURE__*/React.createElement("span", {
    className: "cmt"
  }, "# tools map 1:1 to the REST API, scoped by your key"))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "API keys"), /*#__PURE__*/React.createElement(CardDescription, null, "Manage your API keys for programmatic access.")), /*#__PURE__*/React.createElement(CardContent, null, revealed ? /*#__PURE__*/React.createElement("div", {
    className: "grantnote",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 15,
    style: {
      flexShrink: 0,
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, "Copy your key now \u2014 we never show it again.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12
    }
  }, revealed), " ", /*#__PURE__*/React.createElement(CopyBtn, {
    text: revealed
  }))) : null, keys.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "key",
    title: "No API keys created",
    desc: "Create an API key to access the platform programmatically."
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setModal(true)
  }, "Create your first API key")) : /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, keys.map(k => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: k.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main",
    style: {
      padding: "10px 14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon",
    style: {
      width: 30,
      height: 30
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname",
    style: {
      fontSize: 13
    }
  }, k.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, k.scopes.map(s => /*#__PURE__*/React.createElement("span", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "11px/15px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, "expires ", k.expires), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "danger-outline",
    onClick: () => setKeys(ks => ks.filter(x => x !== k))
  }, "Revoke")))))), keys.length > 0 ? /*#__PURE__*/React.createElement(CardFooter, null, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setModal(true)
  }, "Create key")) : null), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Quickstart"), /*#__PURE__*/React.createElement(CardDescription, null, "TypeScript and Python SDKs, or the Go CLI.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    className: "tabs",
    style: {
      marginBottom: 12
    }
  }, Object.keys(snippets).map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: "tab" + (sdk === s ? " active" : ""),
    onClick: () => setSdk(s)
  }, s))), /*#__PURE__*/React.createElement(CodeBlock, {
    lines: snippets[sdk]
  }), /*#__PURE__*/React.createElement("div", {
    className: "help",
    style: {
      marginTop: 10
    }
  }, "Webhooks are HMAC-signed \u2014 verify ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "X-AGENTPOP_DESIGN-Signature"), " before trusting a delivery. ", /*#__PURE__*/React.createElement("a", {
    href: "docs.html#webhooks"
  }, "API reference"))))), modal ? /*#__PURE__*/React.createElement(CreateKeyModal, {
    onClose: () => setModal(false),
    onCreate: onCreate
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      alignItems: "start",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "MCP server"), /*#__PURE__*/React.createElement(CardDescription, null, "Give Claude and other MCP clients scoped sandbox tools \u2014 every call is audited.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    className: "tabs",
    style: {
      marginBottom: 12
    }
  }, ["Claude Code", "claude_desktop_config.json"].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: "tab" + (mcp === s ? " active" : ""),
    onClick: () => setMcp(s)
  }, s))), mcp === "Claude Code" ? /*#__PURE__*/React.createElement(CodeBlock, {
    lines: [{
      text: "claude mcp add agentpop \\",
      cmt: ""
    }, "  --env AGENTPOP_API_KEY=pop_… \\", "  -- npx -y @agentpop/mcp"]
  }) : /*#__PURE__*/React.createElement(CodeBlock, {
    lines: ['{ "mcpServers": { "agentpop": {', '  "command": "npx", "args": ["-y", "@agentpop/mcp"],', '  "env": { "AGENTPOP_API_KEY": "pop_…" } } } }']
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginTop: 12
    }
  }, ["sandbox_create", "sandbox_exec", "file_put", "file_get", "port_expose", "sandbox_pause", "sandbox_resume", "sandbox_fork", "sandbox_destroy", "agent_logs"].map(t => /*#__PURE__*/React.createElement(Badge, {
    key: t,
    tone: "outline",
    size: "sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "help",
    style: {
      marginTop: 10
    }
  }, "Tools inherit the key\u2019s scopes \u2014 a key without ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "sandbox:exec"), " can\u2019t run commands."))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "Webhook verification"), /*#__PURE__*/React.createElement(CardDescription, null, "Deliveries are HMAC-signed; reject anything you can\u2019t verify.")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement(CodeBlock, {
    lines: [{
      text: 'import { verifyWebhook } from "@agentpop/sdk";',
      cmt: ""
    }, "", 'const ok = verifyWebhook(rawBody, req.headers["x-agentpop-signature"],', "  process.env.AGENTPOP_WEBHOOK_SECRET);", {
      text: "if (!ok) return res.status(401).end();",
      cmt: "HMAC-SHA256(ts + '.' + body), 5 min tolerance"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "file-json"
    }),
    onClick: () => {
      location.href = "docs.html#api";
    }
  }, "OpenAPI 3.1 spec"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "book-open"
    }),
    onClick: () => {
      location.href = "docs.html";
    }
  }, "API reference"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "github"
    }),
    onClick: () => {
      location.href = "docs.html#opensource";
    }
  }, "SDK repos"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "download"
    }),
    onClick: () => {
      location.href = "docs.html#cli";
    }
  }, "CLI releases"))))));
}
Object.assign(window, {
  DeveloperScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DeveloperScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/OverviewScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Badge
} = window.AgentPopDesignSystem_47afa4;
function OverviewScreen() {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const go = window.AGENTPOP_DESIGNNav;
  const running = st.sandboxes.filter(s => s.status === "running").length;
  const agentsUp = st.agents.filter(a => a.status === "running").length;
  const spend = d.meters.reduce((n, m) => n + m.cost, 0);
  const burnDays = Math.round(st.credits / (spend / 22));
  const stats = [{
    l: "Active sandboxes",
    icon: "box",
    v: running,
    d: st.sandboxes.length + " total · quota 40",
    to: ["sandboxes"]
  }, {
    l: "Agents running",
    icon: "bot",
    v: agentsUp,
    d: st.agents.length + " deployed",
    to: ["agents"]
  }, {
    l: "Credits left",
    icon: "coins",
    v: st.credits.toFixed(2),
    d: "≈ " + burnDays + " days at current burn",
    to: ["settings", {
      tab: "billing"
    }]
  }, {
    l: "Spend this month",
    icon: "activity",
    v: spend.toFixed(2) + " cr",
    d: "day 22 of billing cycle",
    to: ["settings", {
      tab: "billing"
    }]
  }];
  const auditIcon = k => k === "destroy" ? "trash-2" : k === "exec" ? "terminal" : k === "update" ? "settings" : "box";
  const quick = [{
    icon: "box",
    t: "Create a sandbox",
    d: "Boot an isolated microVM — cached create-to-ready under 2 s.",
    to: ["sandboxes", {
      create: true
    }]
  }, {
    icon: "bot",
    t: "Deploy an agent",
    d: "Long-running agent in a managed sandbox with scoped grants.",
    to: ["agents", {
      deploy: true
    }]
  }, {
    icon: "plug",
    t: "Connect a provider",
    d: "GitHub, Slack, Gmail, Drive — brokered, tokens never enter VMs.",
    to: ["connectors"]
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Overview",
    desc: d.org.name + " / " + d.org.project + " · us-east"
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => go("sandboxes", {
      create: true
    })
  }, "New sandbox")), /*#__PURE__*/React.createElement("div", {
    className: "statgrid"
  }, stats.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.l,
    type: "button",
    className: "statcard",
    onClick: () => go(s.to[0], s.to[1])
  }, /*#__PURE__*/React.createElement("span", {
    className: "sl"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 14
  }), s.l), /*#__PURE__*/React.createElement("div", {
    className: "sv"
  }, s.v), /*#__PURE__*/React.createElement("div", {
    className: "sd"
  }, s.d)))), /*#__PURE__*/React.createElement("div", {
    className: "panelgrid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("h3", null, "Usage this month", /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "linkbtn",
    onClick: () => go("settings", {
      tab: "billing"
    })
  }, "Billing & usage \u2192")), d.meters.map(m => /*#__PURE__*/React.createElement("div", {
    className: "meter",
    key: m.label
  }, /*#__PURE__*/React.createElement("div", {
    className: "mrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ml"
  }, m.label), /*#__PURE__*/React.createElement("span", {
    className: "mv mono"
  }, m.used, " \xB7 ", m.cost.toFixed(2), " cr")), /*#__PURE__*/React.createElement("div", {
    className: "mbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mfill",
    style: {
      width: m.pct + "%"
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("h3", null, "Recent activity", /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "linkbtn",
    onClick: () => go("audit")
  }, "Audit logs \u2192")), d.audit.slice(0, 5).map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    className: "actline",
    onClick: () => go("audit")
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: auditIcon(a.kind),
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, a.action), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--text-tertiary)",
      fontSize: 11.5,
      marginLeft: 8
    }
  }, a.actor)), a.result === "denied" ? /*#__PURE__*/React.createElement(Badge, {
    tone: "danger",
    size: "sm"
  }, "denied") : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "11px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      flexShrink: 0
    }
  }, a.time))))), /*#__PURE__*/React.createElement("div", {
    className: "qgrid"
  }, quick.map(q => /*#__PURE__*/React.createElement("button", {
    key: q.t,
    type: "button",
    className: "qcard",
    onClick: () => go(q.to[0], q.to[1])
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon",
    style: {
      width: 32,
      height: 32
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: q.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 13.5px/19px var(--font-sans)",
      display: "block"
    }
  }, q.t), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-secondary)",
      display: "block",
      marginTop: 2
    }
  }, q.d)), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15,
    style: {
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  })))));
}
Object.assign(window, {
  OverviewScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ResourceScreens.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  Textarea,
  StatusBadge,
  Badge
} = window.AgentPopDesignSystem_47afa4;
function TemplatesScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Templates",
    desc: "Reusable rootfs images built from a Dockerfile."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setModal(true)
  }, "New template")), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, d.templates.map(t => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: t.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, t.arch), /*#__PURE__*/React.createElement("span", null, t.size), /*#__PURE__*/React.createElement("span", null, "used by ", t.used, " sandboxes"))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "outline",
    size: "sm"
  }, t.version), /*#__PURE__*/React.createElement(StatusBadge, {
    status: t.status,
    label: t.status === "healthy" ? "Build ok" : "Build failed"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, t.updated), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Build logs",
    title: "Build logs"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "scroll-text",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Deprecate",
    title: "Deprecate"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ban",
    size: 15
  }))))))), modal ? /*#__PURE__*/React.createElement(Modal, {
    title: "Create template",
    desc: "Build a reusable rootfs image.",
    onClose: () => setModal(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setModal(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => setModal(false)
    }, "Build template"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    help: "Lowercase letters, digits and dashes only."
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "my-toolbox"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Dockerfile",
    help: "Use a single-stage Dockerfile. Avoid COPY/ADD; install packages through RUN."
  }, /*#__PURE__*/React.createElement(Textarea, {
    mono: true,
    rows: 8,
    defaultValue: "FROM agentpop-base:debian-1\n\n# Add packages you want available in every sandbox booted from this image.\nRUN apt-get update && apt-get install -y --no-install-recommends \\\n    ripgrep jq sqlite3 \\\n && rm -rf /var/lib/apt/lists/*"
  }))) : null);
}
function NetworksScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [attach, setAttach] = React.useState(null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Networks",
    desc: "Private tenant subnets connecting sandboxes across hosts."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    })
  }, "New network")), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, d.networks.map(n => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: n.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "network",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, n.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, n.id.slice(0, 18), "\u2026"), /*#__PURE__*/React.createElement("span", null, n.cidr), /*#__PURE__*/React.createElement("span", null, n.region))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "box",
      size: 12
    })
  }, n.members, " member", n.members === 1 ? "" : "s"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, n.updated), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "View members",
    title: "View members"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Attach sandbox",
    title: "Attach sandbox",
    onClick: () => setAttach(n)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Delete",
    title: "Delete"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }))))))), attach ? /*#__PURE__*/React.createElement(Modal, {
    title: "Add sandbox",
    desc: "Attach to " + attach.name,
    onClose: () => setAttach(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setAttach(null)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => setAttach(null)
    }, "Add sandbox"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Sandbox",
    help: "Members reach each other by private name and IP; cross-network traffic is denied."
  }, /*#__PURE__*/React.createElement(Select, {
    options: window.AGENTPOP_DESIGN.sandboxes.map(s => s.name)
  }))) : null);
}
function StorageScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Storage",
    desc: "S3-compatible disks you register and attach to sandboxes."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setModal(true)
  }, "Register storage")), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, d.storages.map(s => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: s.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "database",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, s.endpoint), /*#__PURE__*/React.createElement("span", null, s.bucket), /*#__PURE__*/React.createElement("span", null, s.region))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "outline",
    size: "sm"
  }, s.attached, " attached"), /*#__PURE__*/React.createElement(StatusBadge, {
    status: s.health
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, "checked ", s.checked), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Detach all",
    title: "Detach all"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "unplug",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Remove",
    title: "Remove"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }))))))), modal ? /*#__PURE__*/React.createElement(Modal, {
    title: "Register storage",
    desc: "Add an S3-compatible disk.",
    onClose: () => setModal(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setModal(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => setModal(false)
    }, "Register storage"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "A name for this storage",
    help: "Used to recognise it later. Lowercase letters, digits and dashes only."
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "my-data"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Bucket name",
    help: "The exact bucket name in your cloud account."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "my-bucket"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Service address",
    help: "For Amazon S3 use https://s3.amazonaws.com. Cloudflare R2, MinIO and Backblaze each have their own URL."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "https://s3.amazonaws.com"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Region",
    optional: true
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "us-east-1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "optrow",
    style: {
      flex: 1.2,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Check, {
    on: true,
    onChange: () => {},
    label: "Older URL style"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t",
    style: {
      fontSize: 13
    }
  }, "Older URL style"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "Leave on for MinIO and most self-hosted setups. Turn off only for Amazon S3.")))), /*#__PURE__*/React.createElement(Field, {
    label: "Access key",
    help: "From your cloud provider's \"access keys\" page."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Secret key",
    help: "Saved in encrypted form. We never show it to you again - keep a copy if you need it."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    type: "password"
  }))) : null);
}
function WebhooksScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  const [events, setEvents] = React.useState(["sandbox.created"]);
  const toggle = ev => setEvents(events.includes(ev) ? events.filter(x => x !== ev) : [...events, ev]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Webhooks",
    desc: "Signed POST deliveries when platform events occur."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setModal(true)
  }, "New webhook")), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, d.webhooks.map(w => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: w.url
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "webhook",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname mono",
    style: {
      fontSize: 13
    }
  }, w.url), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, w.events.map(e => /*#__PURE__*/React.createElement("span", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    status: w.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, w.last), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Send test",
    title: "Send test"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Delete",
    title: "Delete"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }))))))), modal ? /*#__PURE__*/React.createElement(Modal, {
    title: "Create webhook",
    desc: "Receive a POST request when sandbox events occur.",
    onClose: () => setModal(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setModal(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => setModal(false)
    }, "Create webhook"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Endpoint URL",
    help: "Must be a public http or https URL. We sign every delivery so you can verify it came from us."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "https://example.com/webhook"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Events"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px 14px"
    }
  }, d.events.map(ev => /*#__PURE__*/React.createElement("div", {
    className: "kv",
    key: ev,
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement(Check, {
    on: events.includes(ev),
    onChange: () => toggle(ev),
    label: ev
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12
    }
  }, ev)))))) : null);
}
function AuditScreen() {
  const d = window.AGENTPOP_DESIGN;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Audit logs",
    desc: "Every actor, action, and result \u2014 humans and agents alike."
  }), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, d.audit.map((a, i) => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main",
    style: {
      padding: "10px 16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon",
    style: {
      width: 32,
      height: 32
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: a.kind === "destroy" ? "trash-2" : a.kind === "exec" ? "terminal" : a.kind === "update" ? "settings" : "box",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol",
    style: {
      minWidth: 220
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname",
    style: {
      fontSize: 13,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, a.action, " ", /*#__PURE__*/React.createElement(Badge, {
    tone: a.tone,
    size: "sm"
  }, a.kind)), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, a.resource))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, a.actor), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      font: "12px/16px var(--font-mono)",
      color: "var(--text-tertiary)"
    }
  }, a.ip), a.result === "ok" ? /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    size: "sm"
  }, "ok") : /*#__PURE__*/React.createElement(Badge, {
    tone: "danger",
    size: "sm"
  }, "denied"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      display: "inline-flex",
      gap: 5,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 13
  }), a.time))))), /*#__PURE__*/React.createElement("div", {
    className: "pager"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left"
    })
  }, "Prev"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    trailingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right"
    })
  }, "Next")));
}
Object.assign(window, {
  TemplatesScreen,
  NetworksScreen,
  StorageScreen,
  WebhooksScreen,
  AuditScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ResourceScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/SandboxDetailScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  StatusBadge,
  Badge
} = window.AgentPopDesignSystem_47afa4;
function Term({
  sb
}) {
  const [hist, setHist] = React.useState([{
    out: "Connected to " + sb.name + " · guest agent over vsock · type `help`"
  }]);
  const [val, setVal] = React.useState("");
  const box = React.useRef(null);
  const inp = React.useRef(null);
  React.useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  });
  const run = cmd => {
    const c = cmd.trim();
    if (c === "clear") {
      setHist([]);
      return;
    }
    let out = null;
    if (c === "") out = null;else if (c === "help") out = "Available: ls, pwd, whoami, uname -a, cat <file>, echo <text>, node -v, python3 --version, top, clear";else if (c === "ls") out = "agent.js  node_modules  package.json  package-lock.json  workdir";else if (c === "pwd") out = "/home/user";else if (c === "whoami") out = "user";else if (c === "uname -a") out = "Linux " + sb.name + " 6.1.102-agentpop #1 SMP x86_64 GNU/Linux";else if (c === "node -v") out = "v22.11.0";else if (c === "python3 --version") out = "Python 3.12.4";else if (c === "top") out = "CPU 4.2%  MEM 512 MiB / 2 GiB  tasks 24  load 0.08 0.11 0.06";else if (c.indexOf("echo ") === 0) out = c.slice(5);else if (c.indexOf("cat ") === 0) out = c === "cat package.json" ? '{ "name": "' + sb.name + '", "private": true }' : "cat: " + c.slice(4) + ": No such file or directory";else out = "bash: " + c.split(" ")[0] + ": command not found";
    setHist(h => h.concat([{
      cmd: c
    }], out !== null ? [{
      out
    }] : []));
  };
  if (sb.status !== "running") return /*#__PURE__*/React.createElement("div", {
    className: "term",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "#8f8b83"
    }
  }, sb.status === "paused" ? "Sandbox is paused — resume to attach a shell." : sb.status === "failed" ? "Sandbox failed — no shell available. See Events." : "Shell attaches once the sandbox is running…", sb.status === "paused" ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "play"
    }),
    onClick: () => ASXActions.resume(sb.id)
  }, "Resume sandbox")) : null));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cable",
    size: 12
  }), "wss \u2026/v1/sandboxes/", sb.id.slice(0, 11), "/shell"), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, "first byte 212 ms"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "eraser"
    }),
    onClick: () => setHist([])
  }, "Clear")), /*#__PURE__*/React.createElement("div", {
    className: "term as-scroll",
    ref: box,
    onClick: () => inp.current && inp.current.focus()
  }, hist.map((l, i) => l.cmd !== undefined ? /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "p"
  }, "user@", sb.name), ":", /*#__PURE__*/React.createElement("span", {
    className: "path"
  }, "~"), "$ ", l.cmd) : /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      whiteSpace: "pre-wrap"
    }
  }, l.out)), /*#__PURE__*/React.createElement("div", {
    className: "in"
  }, /*#__PURE__*/React.createElement("span", {
    className: "p"
  }, "user@", sb.name), ":", /*#__PURE__*/React.createElement("span", {
    className: "path"
  }, "~"), "$\xA0", /*#__PURE__*/React.createElement("input", {
    ref: inp,
    value: val,
    autoFocus: true,
    spellCheck: false,
    "aria-label": "Terminal input",
    onChange: e => setVal(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        run(val);
        setVal("");
      }
    }
  }))));
}
function FilesTab({
  sb
}) {
  const [files, setFiles] = React.useState(window.AGENTPOP_DESIGN.files);
  const up = () => setFiles(f => [{
    name: "upload-" + (f.length - 5) + ".bin",
    size: "1.4 MB",
    mtime: "just now"
  }].concat(f));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 12
  }), "/home/user"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, files.length, " entries"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "folder-plus"
    }),
    onClick: () => setFiles(f => [{
      name: "new-folder",
      dir: true,
      size: "—",
      mtime: "just now"
    }].concat(f))
  }, "New folder"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "upload"
    }),
    onClick: up
  }, "Upload")), /*#__PURE__*/React.createElement("div", {
    className: "ftable"
  }, files.map((f, i) => /*#__PURE__*/React.createElement("div", {
    className: "frow",
    key: f.name + i
  }, /*#__PURE__*/React.createElement("span", {
    className: "fn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.dir ? "folder" : "file-text",
    size: 15,
    style: {
      color: f.dir ? "var(--accent-text)" : "var(--text-tertiary)"
    }
  }), f.name, f.dir ? "/" : ""), /*#__PURE__*/React.createElement("span", {
    className: "fs"
  }, f.size), /*#__PURE__*/React.createElement("span", {
    className: "fm"
  }, f.mtime), /*#__PURE__*/React.createElement("div", {
    className: "racts"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Download",
    title: "Download"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Delete",
    title: "Delete",
    onClick: () => setFiles(fs => fs.filter((_, j) => j !== i))
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 14
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-tertiary)",
      marginTop: 10
    }
  }, "Files go through the guest agent (`/v1/sandboxes/", "{id}", "/files`) \u2014 no SSH daemon inside the VM."));
}
function PortsTab({
  sb
}) {
  const [port, setPort] = React.useState("3000");
  const [mode, setMode] = React.useState("public");
  const expose = () => {
    const p = parseInt(port, 10);
    if (!p || sb.ports.some(x => x.port === p)) return;
    ASXActions.setSb(sb.id, {
      ports: sb.ports.concat({
        port: p,
        mode,
        url: "https://" + sb.id.slice(0, 11) + "-" + p + ".preview.agentpop.cloud"
      })
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 110
    }
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: port,
    onChange: e => setPort(e.target.value.replace(/\D/g, "")),
    "aria-label": "Port",
    placeholder: "8080"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 160
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["public", "organization", "signed-link"],
    value: mode,
    onChange: e => setMode(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "globe"
    }),
    onClick: expose,
    disabled: sb.status !== "running"
  }, "Expose port")), sb.ports.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "globe",
    title: "No ports exposed",
    desc: "Expose a port to get a public HTTPS preview URL routed through the regional gateway."
  }) : /*#__PURE__*/React.createElement("div", {
    className: "ftable"
  }, sb.ports.map(p => /*#__PURE__*/React.createElement("div", {
    className: "frow",
    key: p.port
  }, /*#__PURE__*/React.createElement("span", {
    className: "portno"
  }, p.port), /*#__PURE__*/React.createElement("span", {
    className: "urlbox",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, p.url)), /*#__PURE__*/React.createElement(Badge, {
    tone: p.mode === "signed-link" ? "warning" : p.mode === "organization" ? "info" : "success",
    size: "sm"
  }, p.mode || "public"), /*#__PURE__*/React.createElement(CopyBtn, {
    text: p.url
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Stop exposing",
    title: "Stop exposing",
    onClick: () => ASXActions.setSb(sb.id, {
      ports: sb.ports.filter(x => x.port !== p.port)
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-tertiary)",
      marginTop: 10
    }
  }, "Wildcard DNS + TLS: https://<sandbox>-<port>.preview.agentpop.cloud"));
}
function Spark({
  label,
  value,
  data,
  max
}) {
  const m = max || Math.max.apply(null, data) * 1.25 || 1;
  const pts = data.map((v, i) => (i * (120 / (data.length - 1))).toFixed(1) + "," + (30 - v / m * 26 + 1).toFixed(1)).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: "panel",
    style: {
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 12px/16px var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 17px/25px var(--font-sans)",
      fontVariantNumeric: "tabular-nums",
      margin: "2px 0 8px"
    }
  }, value), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 32",
    preserveAspectRatio: "none",
    style: {
      width: "100%",
      height: 34,
      display: "block"
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: "1.5",
    vectorEffect: "non-scaling-stroke"
  })));
}
function MetricsTab({
  sb
}) {
  const gen = (base, j) => Array.from({
    length: 40
  }, () => Math.max(0.1, base + (Math.random() - 0.5) * j));
  const [m, setM] = React.useState(() => ({
    cpu: gen(4.5, 4),
    mem: gen(512, 60),
    io: gen(2.8, 2.5),
    net: gen(420, 380)
  }));
  React.useEffect(() => {
    if (sb.status !== "running") return;
    const t = setInterval(() => setM(old => {
      const push = (a, base, j) => a.slice(1).concat(Math.max(0.1, base + (Math.random() - 0.5) * j));
      return {
        cpu: push(old.cpu, 4.5, 4),
        mem: push(old.mem, 512, 60),
        io: push(old.io, 2.8, 2.5),
        net: push(old.net, 420, 380)
      };
    }), 1200);
    return () => clearInterval(t);
  }, [sb.status]);
  if (sb.status !== "running") return /*#__PURE__*/React.createElement(EmptyState, {
    icon: "activity",
    title: "No live metrics",
    desc: "Metrics stream from the host agent while the sandbox is running."
  });
  const last = a => a[a.length - 1];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "statgrid",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Spark, {
    label: "CPU",
    value: last(m.cpu).toFixed(1) + "%",
    data: m.cpu,
    max: 20
  }), /*#__PURE__*/React.createElement(Spark, {
    label: "Memory",
    value: Math.round(last(m.mem)) + " MiB / 2 GiB",
    data: m.mem,
    max: 2048
  }), /*#__PURE__*/React.createElement(Spark, {
    label: "Disk I/O",
    value: last(m.io).toFixed(1) + " MB/s",
    data: m.io
  }), /*#__PURE__*/React.createElement(Spark, {
    label: "Network",
    value: Math.round(last(m.net)) + " KB/s",
    data: m.net
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, "Sampled every second by the host agent \xB7 billed as vCPU-seconds and GiB-seconds of active memory."));
}
function EventsTab({
  sb
}) {
  const boot = [{
    cls: "ok",
    t: "sandbox.created",
    tm: "t+0.00 s",
    d: "API accepted the request · Idempotency-Key 9f2c-… · desired state persisted"
  }, {
    cls: "ok",
    t: "provisioning",
    tm: "t+0.42 s",
    d: "Scheduler placed generation 1 on host ip-10-2-4-11 (us-east-1a) over mTLS"
  }];
  const rows = sb.status === "failed" ? boot.concat({
    cls: "bad",
    t: "sandbox.failed",
    tm: "t+9.81 s",
    d: "microVM exited during boot · exit code 137 · 3 retries exhausted — see audit log"
  }) : boot.concat({
    cls: "ok",
    t: "sandbox.running",
    tm: "t+1.78 s",
    d: "Guest agent ready over vsock · IP " + (sb.ip === "—" ? "10.64.0.x" : sb.ip) + " · webhook sandbox.running delivered"
  }, sb.status === "paused" || sb.status === "pausing" ? [{
    cls: "warn",
    t: "pausing",
    tm: sb.age,
    d: "Snapshot + disk checkpoint uploading to object storage"
  }, {
    cls: "warn",
    t: "sandbox.paused",
    tm: sb.age,
    d: "CPU and RAM released · resume restores the same generation"
  }] : []).flat();
  return /*#__PURE__*/React.createElement("div", {
    className: "tl"
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    className: "tlrow " + r.cls,
    key: r.t
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tt"
  }, r.t, /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, r.tm)), /*#__PURE__*/React.createElement("div", {
    className: "td"
  }, r.d))));
}
function SbSettingsTab({
  sb,
  onDestroy
}) {
  const d = window.AGENTPOP_DESIGN;
  const cur = d.sizes.find(s => s.cpu + " · " + s.ram === sb.size);
  const [size, setSize] = React.useState(cur ? cur.id : d.sizes[2].id);
  const [saved, setSaved] = React.useState(false);
  const changed = !cur || size !== cur.id;
  const apply = () => {
    const s = d.sizes.find(x => x.id === size);
    ASXActions.setSb(sb.id, {
      size: s.cpu + " · " + s.ram
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "settwrap"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Shape",
    help: changed ? "Applying a new shape restarts the microVM with the same disk." : "Current shape."
  }, /*#__PURE__*/React.createElement("div", {
    className: "sizegrid"
  }, d.sizes.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "sizecard" + (size === s.id ? " sel" : ""),
    onClick: () => setSize(s.id),
    role: "radio",
    "aria-checked": size === s.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, s.id), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", null, s.cpu), /*#__PURE__*/React.createElement("span", null, s.ram))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    disabled: !changed && !saved,
    leadingIcon: saved ? /*#__PURE__*/React.createElement(Icon, {
      name: "check"
    }) : null,
    onClick: apply
  }, saved ? "Shape updated" : "Update shape"))), /*#__PURE__*/React.createElement(Field, {
    label: "Idle policy"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["no idle pause", "pause after 5 min", "pause after 15 min", "pause after 1 h"],
    defaultValue: sb.idle || "pause after 15 min"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "TTL",
    help: "The sandbox is destroyed automatically when the TTL elapses."
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["none", "2 h", "24 h", "7 days"],
    defaultValue: "none"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Private network"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["none", "agents-internal", "scraper-pool"],
    defaultValue: "none"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Storage",
    help: "Encrypted S3-compatible volumes registered under Storage."
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["none", "my-data (acme-agent-artifacts)"],
    defaultValue: "none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "dangerp",
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Destroy this sandbox"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "Stops the microVM and deletes its writable disk. Cannot be undone.")), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "trash-2"
    }),
    onClick: onDestroy
  }, "Destroy")));
}
function SandboxDetailScreen({
  id,
  tab: tab0
}) {
  const st = useStore();
  const go = window.AGENTPOP_DESIGNNav;
  const sb = st.sandboxes.find(x => x.id === id);
  const [tab, setTab] = React.useState(tab0 || "terminal");
  const [confirm, setConfirm] = React.useState(false);
  if (!sb) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Sandbox not found"
  }), /*#__PURE__*/React.createElement(EmptyState, {
    icon: "box",
    title: "This sandbox no longer exists",
    desc: "It may have been destroyed, or it was created in a previous session of this demo."
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left"
    }),
    onClick: () => go("sandboxes")
  }, "Back to sandboxes")));
  const busy = sb.status === "pausing" || sb.status === "resuming" || sb.status === "provisioning";
  const TABS = [["terminal", "Terminal"], ["files", "Files"], ["ports", "Ports"], ["metrics", "Metrics"], ["events", "Events"], ["settings", "Settings"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "crumb"
  }, /*#__PURE__*/React.createElement("button", {
    className: "linkbtn",
    onClick: () => go("sandboxes")
  }, "Sandboxes"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 13
  }), /*#__PURE__*/React.createElement("span", null, sb.name)), /*#__PURE__*/React.createElement("div", {
    className: "dhead"
  }, /*#__PURE__*/React.createElement("h1", null, sb.name), /*#__PURE__*/React.createElement(StatusBadge, {
    status: sb.status
  }), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, sb.id, /*#__PURE__*/React.createElement(CopyBtn, {
    text: sb.id
  })), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), sb.status === "paused" ? /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "play"
    }),
    onClick: () => ASXActions.resume(sb.id)
  }, "Resume") : /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    loading: sb.status === "pausing" || sb.status === "resuming",
    disabled: busy || sb.status === "failed",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "pause"
    }),
    onClick: () => ASXActions.pause(sb.id)
  }, "Pause"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    disabled: busy || sb.status === "failed",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "git-fork"
    }),
    onClick: () => {
      const nb = ASXActions.fork(sb);
      go("sandbox", {
        id: nb.id
      });
    }
  }, "Fork"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "trash-2"
    }),
    onClick: () => setConfirm(true)
  }, "Destroy")), /*#__PURE__*/React.createElement("div", {
    className: "dmeta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 12
  }), sb.size), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hard-drive",
    size: 12
  }), sb.disk), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), sb.template), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 12
  }), "us-east"), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "network",
    size: 12
  }), sb.ip), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "git-commit-horizontal",
    size: 12
  }), "gen 3"), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 12
  }), sb.age), /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "moon",
    size: 12
  }), sb.idle || "no idle pause")), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, TABS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: "tab" + (tab === k ? " active" : ""),
    onClick: () => setTab(k)
  }, l, k === "ports" && sb.ports.length ? " (" + sb.ports.length + ")" : ""))), tab === "terminal" ? /*#__PURE__*/React.createElement(Term, {
    sb: sb
  }) : null, tab === "files" ? sb.status === "running" ? /*#__PURE__*/React.createElement(FilesTab, {
    sb: sb
  }) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "files",
    title: "Files unavailable",
    desc: "The file API is reachable while the sandbox is running."
  }) : null, tab === "ports" ? /*#__PURE__*/React.createElement(PortsTab, {
    sb: sb
  }) : null, tab === "metrics" ? /*#__PURE__*/React.createElement(MetricsTab, {
    sb: sb
  }) : null, tab === "events" ? /*#__PURE__*/React.createElement(EventsTab, {
    sb: sb
  }) : null, tab === "settings" ? /*#__PURE__*/React.createElement(SbSettingsTab, {
    sb: sb,
    onDestroy: () => setConfirm(true)
  }) : null, confirm ? /*#__PURE__*/React.createElement(Modal, {
    title: "Destroy sandbox",
    desc: "This stops the microVM and deletes its disk. This cannot be undone.",
    onClose: () => setConfirm(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "est mono"
    }, sb.id.slice(0, 18), "\u2026"), /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setConfirm(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      leadingIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "trash-2"
      }),
      onClick: () => {
        ASXActions.destroy(sb.id);
        go("sandboxes");
      }
    }, "Destroy sandbox"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "13px/19px var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, "Anything running inside ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-primary)"
    }
  }, sb.name), " is terminated immediately. Attached storage registrations are kept; the writable disk is not.")) : null);
}
Object.assign(window, {
  SandboxDetailScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/SandboxDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/SandboxesScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  StatusBadge
} = window.AgentPopDesignSystem_47afa4;
function SandboxRow({
  sb,
  expanded,
  onToggle,
  onAction
}) {
  const go = window.AGENTPOP_DESIGNNav;
  const canExpand = sb.ports.length > 0;
  const stop = e => e.stopPropagation();
  return /*#__PURE__*/React.createElement("div", {
    className: "rrow click"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main",
    onClick: () => go("sandbox", {
      id: sb.id
    })
  }, /*#__PURE__*/React.createElement("span", {
    className: "ricon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "rcol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname"
  }, sb.name), /*#__PURE__*/React.createElement("div", {
    className: "rmeta"
  }, /*#__PURE__*/React.createElement("span", null, sb.size), /*#__PURE__*/React.createElement("span", null, sb.template), /*#__PURE__*/React.createElement("span", null, sb.ip), /*#__PURE__*/React.createElement("span", {
    title: "Sandbox ID"
  }, sb.id.slice(0, 14), "\u2026"))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    status: sb.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hard-drive",
    size: 13
  }), sb.disk), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 13
  }), sb.age), /*#__PURE__*/React.createElement("div", {
    className: "racts",
    onClick: stop
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Terminal",
    title: "Terminal",
    onClick: () => go("sandbox", {
      id: sb.id,
      tab: "terminal"
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "terminal",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": sb.status === "paused" ? "Resume" : "Pause",
    title: sb.status === "paused" ? "Resume" : "Pause",
    onClick: () => onAction(sb, sb.status === "paused" ? "resume" : "pause")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: sb.status === "paused" ? "play" : "pause",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Files",
    title: "Files",
    onClick: () => go("sandbox", {
      id: sb.id,
      tab: "files"
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "files",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Fork",
    title: "Fork",
    onClick: () => {
      const nb = ASXActions.fork(sb);
      go("sandbox", {
        id: nb.id
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "git-fork",
    size: 15
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Destroy",
    title: "Destroy",
    onClick: () => onAction(sb, "destroy")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  })), canExpand ? /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Ports",
    onClick: onToggle
  }, /*#__PURE__*/React.createElement(Icon, {
    name: expanded ? "chevron-up" : "chevron-down",
    size: 15
  })) : null)), expanded && canExpand ? sb.ports.map(p => /*#__PURE__*/React.createElement("div", {
    className: "rports",
    key: p.port
  }, /*#__PURE__*/React.createElement("span", {
    className: "portlbl"
  }, "Public URL"), /*#__PURE__*/React.createElement("span", {
    className: "portno"
  }, p.port), /*#__PURE__*/React.createElement("span", {
    className: "urlbox"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, p.url)), /*#__PURE__*/React.createElement(CopyBtn, {
    text: p.url
  }))) : null);
}
function SandboxesScreen({
  param
}) {
  const st = useStore();
  const list = st.sandboxes;
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("All states");
  const [expanded, setExpanded] = React.useState(list[0] ? list[0].id : null);
  const [sheet, setSheet] = React.useState(!!(param && param.create));
  const [confirm, setConfirm] = React.useState(null);
  const shown = list.filter(s => (q === "" || s.name.includes(q) || s.id.includes(q)) && (status === "All states" || s.status === status));
  const onAction = (sb, act) => {
    if (act === "destroy") {
      setConfirm(sb);
      return;
    }
    ASXActions[act === "pause" ? "pause" : "resume"](sb.id);
  };
  const onCreate = props => {
    const nb = ASXActions.create(props);
    setSheet(false);
    window.AGENTPOP_DESIGNNav("sandbox", {
      id: nb.id,
      tab: "events"
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Sandboxes",
    desc: "Isolated Firecracker microVMs for untrusted and agent-generated code."
  }, /*#__PURE__*/React.createElement(Button, {
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setSheet(true)
  }, "New sandbox")), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "search"
    }),
    placeholder: "Search sandboxes",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 170
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["All states", "running", "provisioning", "paused", "failed"],
    value: status,
    onChange: e => setStatus(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 140
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["us-east", "eu-central"],
    defaultValue: "us-east"
  })), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, shown.length, " of ", list.length)), shown.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "box",
    title: "No sandboxes match",
    desc: "Adjust the search or state filter, or create a new sandbox."
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setSheet(true)
  }, "New sandbox")) : /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, shown.map(sb => /*#__PURE__*/React.createElement(SandboxRow, {
    key: sb.id,
    sb: sb,
    expanded: expanded === sb.id,
    onToggle: () => setExpanded(expanded === sb.id ? null : sb.id),
    onAction: onAction
  }))), sheet ? /*#__PURE__*/React.createElement(CreateSandboxSheet, {
    onClose: () => setSheet(false),
    onCreate: onCreate
  }) : null, confirm ? /*#__PURE__*/React.createElement(Modal, {
    title: "Destroy sandbox",
    desc: "This stops the microVM and deletes its disk. This cannot be undone.",
    onClose: () => setConfirm(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "est mono"
    }, confirm.id.slice(0, 18), "\u2026"), /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setConfirm(null)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      leadingIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "trash-2"
      }),
      onClick: () => {
        ASXActions.destroy(confirm.id);
        setConfirm(null);
      }
    }, "Destroy sandbox"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "13px/19px var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, "Anything running inside ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-primary)"
    }
  }, confirm.name), " is terminated immediately. Attached storage registrations are kept; the writable disk is not.")) : null);
}
Object.assign(window, {
  SandboxesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/SandboxesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/SettingsScreen.jsx
try { (() => {
const {
  Button,
  Icon,
  Input,
  Badge
} = window.AgentPopDesignSystem_47afa4;
function ProjectTab() {
  const [saved, setSaved] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  return /*#__PURE__*/React.createElement("div", {
    className: "settwrap"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Project name"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "production"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Project slug",
    help: "Used in API paths and preview hostnames."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    defaultValue: "acme-labs/production",
    disabled: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Region",
    help: "New sandboxes are placed in this region by default."
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["us-east", "eu-central"],
    defaultValue: "us-east"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Default idle policy"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["no idle pause", "pause after 5 min", "pause after 15 min", "pause after 1 h"],
    defaultValue: "pause after 15 min"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Default sandbox TTL"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["none", "2 h", "24 h", "7 days"],
    defaultValue: "none"
  })), /*#__PURE__*/React.createElement(Button, {
    leadingIcon: saved ? /*#__PURE__*/React.createElement(Icon, {
      name: "check"
    }) : null,
    onClick: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  }, saved ? "Saved" : "Save changes"), /*#__PURE__*/React.createElement("div", {
    className: "dangerp",
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Delete this project"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, "Destroys every sandbox, agent, grant, and key in acme-labs/production.")), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    onClick: () => setDel(true)
  }, "Delete project")), del ? /*#__PURE__*/React.createElement(Modal, {
    title: "Delete project",
    desc: "This destroys all resources in the project. This cannot be undone.",
    onClose: () => {
      setDel(false);
      setTyped("");
    },
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => {
        setDel(false);
        setTyped("");
      }
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      disabled: typed !== "production",
      leadingIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "trash-2"
      }),
      onClick: () => {
        setDel(false);
        setTyped("");
      }
    }, "Delete project"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement("span", null, "Type ", /*#__PURE__*/React.createElement("b", null, "production"), " to confirm")
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    placeholder: "production",
    value: typed,
    onChange: e => setTyped(e.target.value)
  }))) : null);
}
function MembersTab() {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const [invite, setInvite] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("Project developer");
  const setMember = (em, patch) => ASXStore.set(s => ({
    members: s.members.map(m => m.email === em ? {
      ...m,
      ...patch
    } : m)
  }));
  const send = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    ASXStore.set(s => ({
      members: s.members.concat({
        name: email.split("@")[0],
        email,
        role,
        mfa: false,
        pending: true,
        joined: "invited just now"
      })
    }));
    setInvite(false);
    setEmail("");
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, st.members.length, " members \xB7 roles follow the org \u2192 project hierarchy"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "user-plus"
    }),
    onClick: () => setInvite(true)
  }, "Invite member")), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, st.members.map(m => /*#__PURE__*/React.createElement("div", {
    className: "rrow",
    key: m.email
  }, /*#__PURE__*/React.createElement("div", {
    className: "rrow-main",
    style: {
      padding: "10px 16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar"
  }, m.name.split(".").map(x => x[0]).join("").toUpperCase().slice(0, 2)), /*#__PURE__*/React.createElement("div", {
    className: "rcol",
    style: {
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rname",
    style: {
      fontSize: 13,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, m.name, m.pending ? /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    size: "sm"
  }, "pending") : null, m.mfa ? /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    size: "sm"
  }, "MFA") : /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    size: "sm"
  }, "no MFA")), /*#__PURE__*/React.createElement("div", {
    className: "rmeta",
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", null, m.email), /*#__PURE__*/React.createElement("span", null, m.joined))), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 210
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: d.roles,
    value: m.role,
    disabled: m.role === "Organization owner",
    onChange: e => setMember(m.email, {
      role: e.target.value
    }),
    "aria-label": "Role for " + m.name
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Remove member",
    title: m.role === "Organization owner" ? "The owner cannot be removed" : "Remove",
    disabled: m.role === "Organization owner",
    onClick: () => ASXStore.set(s => ({
      members: s.members.filter(x => x.email !== m.email)
    }))
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user-minus",
    size: 15
  })))))), invite ? /*#__PURE__*/React.createElement(Modal, {
    title: "Invite member",
    desc: "Invites expire after 7 days.",
    onClose: () => setInvite(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setInvite(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      leadingIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "send"
      }),
      onClick: send
    }, "Send invite"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "teammate@acmelabs.dev",
    value: email,
    onChange: e => setEmail(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Role",
    help: "Owner and admin act at the organization level; developer, operator, and viewer are per-project."
  }, /*#__PURE__*/React.createElement(Select, {
    options: window.AGENTPOP_DESIGN.roles.slice(1),
    value: role,
    onChange: e => setRole(e.target.value)
  }))) : null);
}
function BillingTab({
  autoOpen
}) {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const [add, setAdd] = React.useState(!!autoOpen);
  const [amt, setAmt] = React.useState(100);
  const total = d.meters.reduce((n, m) => n + m.cost, 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "panelgrid",
    style: {
      gridTemplateColumns: "1fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("h3", null, "Prepaid credits"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 28px/36px var(--font-sans)",
      fontVariantNumeric: "tabular-nums"
    }
  }, st.credits.toFixed(2)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-tertiary)",
      margin: "2px 0 14px"
    }
  }, "Usage is metered against credits \u2014 spend stops when they run out."), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }),
    onClick: () => setAdd(true)
  }, "Add credits")), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("h3", null, "Plan", /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    size: "sm"
  }, "current")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px/22px var(--font-sans)"
    }
  }, "Developer"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px/17px var(--font-sans)",
      color: "var(--text-secondary)",
      margin: "2px 0 14px"
    }
  }, "$20/mo platform fee + metered compute, storage, and egress."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Compare plans"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "credit-card",
    size: 14
  }), "Visa \xB7\xB7\xB7\xB7 4242")))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("h3", null, "Usage this month", /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)",
      fontWeight: 400
    }
  }, "day 22 of cycle")), /*#__PURE__*/React.createElement("div", {
    className: "ftable",
    style: {
      boxShadow: "none"
    }
  }, d.meters.map(m => /*#__PURE__*/React.createElement("div", {
    className: "frow",
    key: m.label
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "500 13px/18px var(--font-sans)"
    }
  }, m.label), /*#__PURE__*/React.createElement("span", {
    className: "fs",
    style: {
      width: 110
    }
  }, m.used), /*#__PURE__*/React.createElement("span", {
    className: "fm",
    style: {
      width: 150
    }
  }, m.unit), /*#__PURE__*/React.createElement("span", {
    className: "fs",
    style: {
      width: 90,
      color: "var(--text-primary)"
    }
  }, m.cost.toFixed(2), " cr"))), /*#__PURE__*/React.createElement("div", {
    className: "frow",
    style: {
      background: "var(--surface-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "600 13px/18px var(--font-sans)"
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "fs",
    style: {
      width: 90,
      font: "600 13px/18px var(--font-mono)",
      color: "var(--text-primary)"
    }
  }, total.toFixed(2), " cr")))), add ? /*#__PURE__*/React.createElement(Modal, {
    title: "Add credits",
    desc: "Prepaid credits are charged to the payment method on file.",
    onClose: () => setAdd(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "est"
    }, /*#__PURE__*/React.createElement("b", null, amt, " cr"), " \xB7 $", amt, ".00 + tax"), /*#__PURE__*/React.createElement("span", {
      className: "spacer"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setAdd(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      leadingIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus"
      }),
      onClick: () => {
        ASXActions.addCredits(amt);
        setAdd(false);
      }
    }, "Add ", amt, " credits"))
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Amount"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [25, 100, 500].map(n => /*#__PURE__*/React.createElement(Button, {
    key: n,
    size: "sm",
    variant: amt === n ? "primary" : "outline",
    onClick: () => setAmt(n)
  }, n)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120
    }
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: String(amt),
    onChange: e => setAmt(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0),
    "aria-label": "Custom amount"
  }))))) : null);
}
function QuotasTab() {
  const d = window.AGENTPOP_DESIGN;
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "settwrap",
    style: {
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grantnote"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 16,
    style: {
      flexShrink: 0,
      marginTop: 1
    }
  }), "Quotas cap concurrent usage to protect the platform and your bill. Hard caps live at the organization level; this shows acme-labs/production."), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, d.quotas.map(q => {
    const pct = Math.round(q.used / q.cap * 100);
    return /*#__PURE__*/React.createElement("div", {
      className: "meter",
      key: q.label
    }, /*#__PURE__*/React.createElement("div", {
      className: "mrow"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ml"
    }, q.label, q.note ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-tertiary)",
        fontWeight: 400
      }
    }, " \xB7 ", q.note) : null), /*#__PURE__*/React.createElement("span", {
      className: "mv mono"
    }, q.used, q.unit ? " " + q.unit : "", " / ", q.cap, q.unit ? " " + q.unit : "")), /*#__PURE__*/React.createElement("div", {
      className: "mbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mfill" + (pct > 75 ? " warn" : ""),
      style: {
        width: pct + "%"
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: sent ? "check" : "arrow-up-right"
    }),
    disabled: sent,
    onClick: () => setSent(true)
  }, sent ? "Request sent" : "Request an increase"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px/16px var(--font-sans)",
      color: "var(--text-tertiary)"
    }
  }, "Reviewed within one business day.")));
}
function SettingsScreen({
  param
}) {
  const p = param || {};
  const [tab, setTab] = React.useState(p.tab || "project");
  const TABS = [["project", "Project"], ["members", "Members"], ["billing", "Billing & usage"], ["quotas", "Quotas"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Settings",
    desc: "Project configuration, membership, billing, and quotas for acme-labs/production."
  }), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, TABS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: "tab" + (tab === k ? " active" : ""),
    onClick: () => setTab(k)
  }, l))), tab === "project" ? /*#__PURE__*/React.createElement(ProjectTab, null) : null, tab === "members" ? /*#__PURE__*/React.createElement(MembersTab, null) : null, tab === "billing" ? /*#__PURE__*/React.createElement(BillingTab, {
    autoOpen: p.addCredits
  }) : null, tab === "quotas" ? /*#__PURE__*/React.createElement(QuotasTab, null) : null);
}
Object.assign(window, {
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Shell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Button,
  Icon
} = window.AgentPopDesignSystem_47afa4;
function useStore() {
  return React.useSyncExternalStore(window.AGENTPOP_DESIGNStore.sub, window.AGENTPOP_DESIGNStore.get);
}
const NAV = [{
  id: "overview",
  label: "Overview",
  icon: "house"
}, {
  id: "sandboxes",
  label: "Sandboxes",
  icon: "box"
}, {
  id: "agents",
  label: "Agents",
  icon: "bot"
}, {
  id: "connectors",
  label: "Connectors",
  icon: "plug"
}, {
  id: "templates",
  label: "Templates",
  icon: "layers"
}, {
  id: "networks",
  label: "Networks",
  icon: "network"
}, {
  id: "storage",
  label: "Storage",
  icon: "database"
}, {
  id: "webhooks",
  label: "Webhooks",
  icon: "webhook"
}, {
  id: "audit",
  label: "Audit logs",
  icon: "scroll-text"
}, {
  id: "developer",
  label: "Developer",
  icon: "code"
}, {
  id: "settings",
  label: "Settings",
  icon: "settings"
}];
function Shell({
  route,
  onRoute,
  children
}) {
  const d = window.AGENTPOP_DESIGN;
  const st = useStore();
  return /*#__PURE__*/React.createElement("div", {
    className: "kit"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "sb"
  }, /*#__PURE__*/React.createElement("button", {
    className: "sb-org",
    type: "button"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mark"
  }, "A"), /*#__PURE__*/React.createElement("span", {
    className: "uinfo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, d.org.name), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "pr"
  }, d.org.project)), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "chevrons-up-down",
    size: 14,
    style: {
      color: "var(--text-tertiary)"
    }
  })), /*#__PURE__*/React.createElement("nav", {
    className: "sb-nav"
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    type: "button",
    className: "sb-item" + (route === n.id ? " active" : ""),
    onClick: () => onRoute(n.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, n.label)))), /*#__PURE__*/React.createElement("div", {
    className: "sb-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "credits"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "amt"
  }, st.credits.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    className: "cap"
  }, "credits left")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    style: {
      width: "100%",
      marginTop: 8
    },
    onClick: () => window.AGENTPOP_DESIGNNav("settings", {
      tab: "billing",
      addCredits: true
    })
  }, "Add credits")), /*#__PURE__*/React.createElement("div", {
    className: "userrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar"
  }, "SO"), /*#__PURE__*/React.createElement("span", {
    className: "uinfo",
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 12px/15px var(--font-sans)",
      display: "block"
    }
  }, d.user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "11px/14px var(--font-sans)",
      color: "var(--text-tertiary)",
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, d.user.email)), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    "aria-label": "Sign out",
    title: "Sign out",
    onClick: () => {
      location.href = "auth.html?mode=signin";
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "content as-scroll"
  }, children)));
}
function PageHeader({
  title,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "page-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, title), desc ? /*#__PURE__*/React.createElement("p", null, desc) : null), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), children);
}
function Field({
  label,
  optional,
  help,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, label ? /*#__PURE__*/React.createElement("label", null, label, " ", optional ? /*#__PURE__*/React.createElement("em", null, "(optional)") : null) : null, children, help ? /*#__PURE__*/React.createElement("div", {
    className: "help" + (error ? " err" : "")
  }, help) : null);
}
function Select({
  options,
  value,
  onChange,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "selwrap",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange
  }, props), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 16
  }));
}
function Toggle({
  on,
  onChange,
  label
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": !!on,
    "aria-label": label,
    className: "tgl" + (on ? " on" : ""),
    onClick: () => onChange(!on)
  });
}
function Check({
  on,
  onChange,
  label
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "checkbox",
    "aria-checked": !!on,
    "aria-label": label,
    className: "chk" + (on ? " on" : ""),
    onClick: () => onChange(!on)
  }, on ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    strokeWidth: 3
  }) : null);
}
function Sheet({
  title,
  desc,
  footer,
  onClose,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    role: "dialog",
    "aria-label": title
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, title), desc ? /*#__PURE__*/React.createElement("p", null, desc) : null), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    onClick: onClose,
    "aria-label": "Close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-b as-scroll"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "sheet-f"
  }, footer) : null));
}
function Modal({
  title,
  desc,
  footer,
  onClose,
  children,
  width
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    role: "dialog",
    "aria-label": title,
    style: width ? {
      width
    } : null
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-h"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, title), desc ? /*#__PURE__*/React.createElement("p", null, desc) : null), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon-sm",
    onClick: onClose,
    "aria-label": "Close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-b as-scroll"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "sheet-f"
  }, footer) : null));
}
function EmptyState({
  icon,
  title,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "emptybox"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    className: "et"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "ed"
  }, desc), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, children) : null);
}
function CopyBtn({
  text
}) {
  const [ok, setOk] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "copybtn",
    "aria-label": "Copy",
    onClick: () => {
      try {
        navigator.clipboard.writeText(text);
      } catch (e) {}
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ok ? "check" : "copy",
    size: 14
  }));
}
function CodeBlock({
  lines
}) {
  const text = lines.map(l => typeof l === "string" ? l : l.text).join("\n");
  return /*#__PURE__*/React.createElement("div", {
    className: "codebl"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "cpy",
    "aria-label": "Copy",
    onClick: () => {
      try {
        navigator.clipboard.writeText(text);
      } catch (e) {}
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "copy",
    size: 14
  })), lines.map((l, i) => typeof l === "string" ? /*#__PURE__*/React.createElement("div", {
    key: i
  }, l) : /*#__PURE__*/React.createElement("div", {
    key: i
  }, l.text, " ", l.cmt ? /*#__PURE__*/React.createElement("span", {
    className: "cmt"
  }, "# ", l.cmt) : null)));
}
function Stub({
  what
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stub"
  }, what, " is not defined in the source material \u2014 intentionally left blank rather than invented.");
}
Object.assign(window, {
  Shell,
  PageHeader,
  Field,
  Select,
  Toggle,
  Check,
  Sheet,
  Modal,
  EmptyState,
  CopyBtn,
  CodeBlock,
  Stub,
  useStore
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.js
try { (() => {
window.AGENTPOP_DESIGN = {
  org: {
    name: "acme-labs",
    project: "production"
  },
  user: {
    name: "sam.ortiz",
    email: "sam@acmelabs.dev",
    credits: "412.06"
  },
  sizes: [{
    id: "s-0.25vcpu-512mb",
    cpu: "0.25 vCPU",
    ram: "512 MiB"
  }, {
    id: "s-0.5vcpu-1gb",
    cpu: "0.5 vCPU",
    ram: "1 GiB"
  }, {
    id: "s-1vcpu-2gb",
    cpu: "1 vCPU",
    ram: "2 GiB"
  }, {
    id: "s-2vcpu-4gb",
    cpu: "2 vCPU",
    ram: "4 GiB"
  }],
  sandboxes: [{
    id: "sb-01ky47z9f7xww4gmqjxj69s6wy",
    name: "api-smoke-tests",
    status: "running",
    size: "1 vCPU · 2 GiB",
    disk: "10 GB",
    template: "devbox:1",
    ip: "10.64.0.14",
    age: "21 seconds ago",
    idle: "pause after 15 min",
    ports: [{
      port: 8080,
      url: "https://sb-01ky47z9f7-8080.preview.agentpop.cloud"
    }]
  }, {
    id: "sb-01ky3vq2mlh8trwd0p4c9xn2ee",
    name: "agent-workdir",
    status: "running",
    size: "2 vCPU · 4 GiB",
    disk: "20 GB",
    template: "python-ml:3",
    ip: "10.64.0.9",
    age: "2 hours ago",
    idle: "no idle pause",
    ports: []
  }, {
    id: "sb-01ky2rr8vbn5jqzc7t1m3ka9od",
    name: "pr-4812-preview",
    status: "provisioning",
    size: "0.5 vCPU · 1 GiB",
    disk: "10 GB",
    template: "devbox:1",
    ip: "—",
    age: "just now",
    idle: "TTL 2 h",
    ports: []
  }, {
    id: "sb-01kxzt5dwqp2necx8g6f0hj4ma",
    name: "nightly-scraper",
    status: "paused",
    size: "0.25 vCPU · 512 MiB",
    disk: "5 GB",
    template: "node-lts:2",
    ip: "10.64.0.31",
    age: "3 days ago",
    idle: "pause after 5 min",
    ports: []
  }, {
    id: "sb-01kxy0b3rfm9uslz2w7q5vd8ct",
    name: "gpu-eval",
    status: "failed",
    size: "2 vCPU · 4 GiB",
    disk: "40 GB",
    template: "custom-cuda:1",
    ip: "—",
    age: "5 days ago",
    idle: "no idle pause",
    ports: []
  }],
  templates: [{
    name: "devbox",
    version: "v1",
    arch: "x86_64",
    size: "412 MB",
    status: "healthy",
    updated: "2 days ago",
    used: 38
  }, {
    name: "python-ml",
    version: "v3",
    arch: "x86_64",
    size: "1.9 GB",
    status: "healthy",
    updated: "6 days ago",
    used: 12
  }, {
    name: "node-lts",
    version: "v2",
    arch: "arm64",
    size: "608 MB",
    status: "healthy",
    updated: "2 weeks ago",
    used: 9
  }, {
    name: "custom-cuda",
    version: "v1",
    arch: "x86_64",
    size: "4.2 GB",
    status: "failed",
    updated: "5 days ago",
    used: 1
  }],
  networks: [{
    name: "agents-internal",
    id: "net-01ky480q3k3wt5nrgyjvg0x7vw",
    cidr: "10.72.0.0/24",
    region: "us-east",
    members: 3,
    updated: "1 minute ago"
  }, {
    name: "scraper-pool",
    id: "net-01kx9m2dfe8bqal4c5rz7ws3hn",
    cidr: "10.72.1.0/24",
    region: "us-east",
    members: 1,
    updated: "4 days ago"
  }],
  storages: [{
    name: "my-data",
    endpoint: "https://s3.amazonaws.com",
    bucket: "acme-agent-artifacts",
    region: "us-east-1",
    attached: 2,
    health: "healthy",
    checked: "5 minutes ago"
  }],
  webhooks: [{
    url: "https://ops.acmelabs.dev/hooks/sandbox",
    events: ["sandbox.created", "sandbox.failed", "agent.stopped"],
    status: "active",
    last: "delivered 12 min ago"
  }],
  audit: [{
    action: "Sandbox create",
    kind: "create",
    tone: "success",
    resource: "sb-01ky47z9f7xww4gmqjxj69s6wy",
    actor: "sam.ortiz",
    ip: "203.0.113.7",
    result: "ok",
    time: "2 minutes ago"
  }, {
    action: "API key create",
    kind: "create",
    tone: "success",
    resource: "key-ci-deploys",
    actor: "sam.ortiz",
    ip: "203.0.113.7",
    result: "ok",
    time: "1 hour ago"
  }, {
    action: "Connector grant update",
    kind: "update",
    tone: "info",
    resource: "grant-github-issues",
    actor: "mara.chen",
    ip: "198.51.100.23",
    result: "ok",
    time: "3 hours ago"
  }, {
    action: "Sandbox destroy",
    kind: "destroy",
    tone: "danger",
    resource: "sb-01kxv8p1qgd4hjwm6y2t9zb5rk",
    actor: "agent:issue-triage",
    ip: "10.64.0.9",
    result: "ok",
    time: "yesterday"
  }, {
    action: "Sandbox exec",
    kind: "exec",
    tone: "neutral",
    resource: "sb-01ky3vq2mlh8trwd0p4c9xn2ee",
    actor: "agent:issue-triage",
    ip: "10.64.0.9",
    result: "denied",
    time: "yesterday"
  }],
  agents: [{
    name: "issue-triage",
    template: "openclaw-compatible",
    model: "claude-sonnet-4-5",
    status: "running",
    sandbox: "sb-01ky3vq2mlh8trwd0p4c9xn2ee",
    connectors: ["GitHub", "Slack"],
    age: "up 6 days"
  }, {
    name: "inbox-digest",
    template: "openclaw-compatible",
    model: "claude-haiku-4-5",
    status: "deploying",
    sandbox: "sb-01ky2rr8vbn5jqzc7t1m3ka9od",
    connectors: ["Gmail"],
    age: "just now"
  }],
  connectors: [{
    name: "GitHub",
    icon: "github",
    desc: "Repos, issues, pull requests",
    connected: true,
    account: "acme-labs (org)",
    grants: 2,
    health: "healthy"
  }, {
    name: "Slack",
    icon: "slack",
    desc: "Channels and messages",
    connected: true,
    account: "acmelabs.slack.com",
    grants: 1,
    health: "healthy"
  }, {
    name: "Gmail",
    icon: "mail",
    desc: "Read and send mail",
    connected: false
  }, {
    name: "Google Drive",
    icon: "hard-drive",
    desc: "Files and folders",
    connected: false
  }],
  events: ["sandbox.created", "sandbox.running", "sandbox.paused", "sandbox.resumed", "sandbox.destroyed", "sandbox.failed", "agent.deployed", "agent.stopped", "agent.failed", "connector.grant.changed"],
  scopes: ["sandbox:write", "sandbox:exec", "connector:invoke", "audit:read"]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.js", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/store.js
try { (() => {
// Shared mock store + actions: lets list, detail, overview, settings, and sidebar stay in sync.
(function () {
  var AGENTPOP_DESIGN = window.AGENTPOP_DESIGN;
  AGENTPOP_DESIGN.roles = ["Organization owner", "Organization admin", "Project developer", "Project operator", "Project viewer"];
  AGENTPOP_DESIGN.members = [{
    name: "sam.ortiz",
    email: "sam@acmelabs.dev",
    role: "Organization owner",
    mfa: true,
    joined: "Nov 2025"
  }, {
    name: "mara.chen",
    email: "mara@acmelabs.dev",
    role: "Organization admin",
    mfa: true,
    joined: "Dec 2025"
  }, {
    name: "dev.patel",
    email: "dev@acmelabs.dev",
    role: "Project developer",
    mfa: true,
    joined: "Jan 2026"
  }, {
    name: "rio.tanaka",
    email: "rio@acmelabs.dev",
    role: "Project operator",
    mfa: false,
    joined: "Mar 2026"
  }, {
    name: "ana.silva",
    email: "ana@acmelabs.dev",
    role: "Project viewer",
    mfa: true,
    joined: "Jun 2026"
  }];
  AGENTPOP_DESIGN.meters = [{
    label: "vCPU-seconds",
    used: "412,806",
    pct: 61,
    cost: 24.77,
    unit: "0.00006 cr/s"
  }, {
    label: "Memory GiB-seconds",
    used: "1,651,224",
    pct: 48,
    cost: 41.28,
    unit: "0.000025 cr/GiB-s"
  }, {
    label: "Disk GiB-hours",
    used: "8,140",
    pct: 33,
    cost: 16.28,
    unit: "0.002 cr/GiB-h"
  }, {
    label: "Snapshot GiB-months",
    used: "22.4",
    pct: 18,
    cost: 5.6,
    unit: "0.25 cr/GiB-mo"
  }, {
    label: "Internet egress GiB",
    used: "64.2",
    pct: 26,
    cost: 30.19,
    unit: "0.47 cr/GiB"
  }];
  AGENTPOP_DESIGN.quotas = [{
    label: "Active sandboxes",
    used: 12,
    cap: 40,
    note: "running + provisioning"
  }, {
    label: "vCPU in use",
    used: 9,
    cap: 32
  }, {
    label: "Active memory",
    used: 18,
    cap: 64,
    unit: "GiB"
  }, {
    label: "Sandbox disk",
    used: 310,
    cap: 1024,
    unit: "GB"
  }, {
    label: "Preview URLs",
    used: 6,
    cap: 25
  }, {
    label: "Webhook endpoints",
    used: 1,
    cap: 10
  }];
  AGENTPOP_DESIGN.files = [{
    name: "workdir",
    dir: true,
    size: "—",
    mtime: "2 minutes ago"
  }, {
    name: "node_modules",
    dir: true,
    size: "—",
    mtime: "2 hours ago"
  }, {
    name: "agent.js",
    size: "4.1 KB",
    mtime: "2 minutes ago"
  }, {
    name: "package.json",
    size: "1.2 KB",
    mtime: "2 hours ago"
  }, {
    name: "package-lock.json",
    size: "182 KB",
    mtime: "2 hours ago"
  }, {
    name: ".env",
    size: "96 B",
    mtime: "2 hours ago"
  }];
  AGENTPOP_DESIGN.agentLogs = ["[06:12:04] agent booted · openclaw-compatible v1", "[06:12:05] model claude-sonnet-4-5 · secret/anthropic-prod (reference, never injected)", "[06:12:05] connector grant ok: github (repo:read, issues:write) via broker", "[06:12:06] connector grant ok: slack (chat:write #ops)", "[06:12:11] watching #ops for triage requests", "[06:14:32] task complete · acme/api#4812 labeled needs-repro", "[06:41:07] idle · heartbeat ok · generation 3"];
  var state = {
    sandboxes: AGENTPOP_DESIGN.sandboxes.slice(),
    agents: AGENTPOP_DESIGN.agents.slice(),
    members: AGENTPOP_DESIGN.members.slice(),
    credits: 412.06
  };
  var subs = [];
  function emit() {
    subs.forEach(function (f) {
      f();
    });
  }
  window.AGENTPOP_DESIGNStore = {
    get: function () {
      return state;
    },
    set: function (patch) {
      state = Object.assign({}, state, typeof patch === "function" ? patch(state) : patch);
      emit();
    },
    sub: function (f) {
      subs.push(f);
      return function () {
        subs = subs.filter(function (x) {
          return x !== f;
        });
      };
    }
  };
  var S = window.AGENTPOP_DESIGNStore;
  function setSb(id, patch) {
    S.set(function (s) {
      return {
        sandboxes: s.sandboxes.map(function (x) {
          return x.id === id ? Object.assign({}, x, patch) : x;
        })
      };
    });
  }
  function agentSet(name, patch) {
    S.set(function (s) {
      return {
        agents: s.agents.map(function (a) {
          return a.name === name ? Object.assign({}, a, patch) : a;
        })
      };
    });
  }
  function newId() {
    return "sb-01" + Math.random().toString(36).slice(2, 26);
  }
  function create(props) {
    var nb = Object.assign({
      id: newId(),
      name: "sandbox",
      status: "provisioning",
      size: "1 vCPU · 2 GiB",
      disk: "10 GB",
      template: "devbox:1",
      ip: "—",
      age: "just now",
      idle: "pause after 15 min",
      ports: []
    }, props);
    S.set(function (s) {
      return {
        sandboxes: [nb].concat(s.sandboxes)
      };
    });
    setTimeout(function () {
      setSb(nb.id, {
        status: "running",
        ip: "10.64.0." + (20 + Math.floor(Math.random() * 60))
      });
    }, 2600);
    return nb;
  }
  window.AGENTPOP_DESIGNActions = {
    setSb: setSb,
    agentSet: agentSet,
    create: create,
    pause: function (id) {
      setSb(id, {
        status: "pausing"
      });
      setTimeout(function () {
        setSb(id, {
          status: "paused"
        });
      }, 1500);
    },
    resume: function (id) {
      setSb(id, {
        status: "resuming"
      });
      setTimeout(function () {
        setSb(id, {
          status: "running"
        });
      }, 1700);
    },
    destroy: function (id) {
      S.set(function (s) {
        return {
          sandboxes: s.sandboxes.filter(function (x) {
            return x.id !== id;
          })
        };
      });
    },
    fork: function (sb) {
      var nb = Object.assign({}, sb, {
        id: newId(),
        name: (sb.name + "-fork").slice(0, 22),
        status: "provisioning",
        ip: "—",
        age: "just now",
        ports: []
      });
      S.set(function (s) {
        return {
          sandboxes: [nb].concat(s.sandboxes)
        };
      });
      setTimeout(function () {
        setSb(nb.id, {
          status: "running",
          ip: "10.64.0." + (20 + Math.floor(Math.random() * 60))
        });
      }, 2600);
      return nb;
    },
    deployAgent: function (o) {
      var vm = create({
        name: (o.name + "-vm").slice(0, 22),
        template: "openclaw:1",
        size: o.size || "1 vCPU · 2 GiB"
      });
      var a = {
        name: o.name,
        template: "openclaw-compatible",
        model: o.model || "claude-sonnet-4-5",
        status: "deploying",
        sandbox: vm.id,
        connectors: o.connectors || [],
        age: "just now"
      };
      S.set(function (s) {
        return {
          agents: [a].concat(s.agents)
        };
      });
      setTimeout(function () {
        agentSet(o.name, {
          status: "running",
          age: "up 1 minute"
        });
      }, 3000);
      return a;
    },
    stopAgent: function (name) {
      agentSet(name, {
        status: "stopped",
        age: "stopped just now"
      });
    },
    restartAgent: function (name) {
      agentSet(name, {
        status: "deploying",
        age: "just now"
      });
      setTimeout(function () {
        agentSet(name, {
          status: "running",
          age: "up 1 minute"
        });
      }, 2200);
    },
    addCredits: function (n) {
      S.set(function (s) {
        return {
          credits: +(s.credits + n).toFixed(2)
        };
      });
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/store.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.STATUS_META = __ds_scope.STATUS_META;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

})();
