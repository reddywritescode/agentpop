import * as React from "react";

const SVG_DEFAULTS = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };
function pascal(name) { return String(name).split(/[-_ ]/).map((s) => (s ? s[0].toUpperCase() + s.slice(1) : "")).join(""); }
function toReactAttrs(attrs) {
  const out = {};
  for (const k in attrs) { out[k === "class" ? "className" : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attrs[k]; }
  return out;
}

/**
 * Lucide icon wrapper. Requires the lucide UMD build on the page:
 * <script src="https://unpkg.com/lucide@0.462.0/dist/umd/lucide.min.js"></script>
 * Renders a 2px-stroke icon by kebab-case name, e.g. <Icon name="circle-check" />.
 */
export function Icon({ name, size = 16, strokeWidth = 2, spin = false, className = "", style, ...props }) {
  const lucide = typeof window !== "undefined" ? window.lucide : null;
  const source = lucide ? (lucide.icons || lucide) : null;
  const node = source ? (source[pascal(name)] || source[name]) : null;
  // lucide ships two array shapes: a bare child list [["path",{...}],...] and a wrapped
  // element tuple ["svg", {attrs}, [children]] — unwrap the latter.
  const kids = Array.isArray(node) && typeof node[0] === "string" && Array.isArray(node[2]) ? node[2] : node;
  const children = Array.isArray(kids)
    ? kids.map((child, i) => {
        const [tag, attrs] = Array.isArray(child) ? child : [child.tag, child.attrs];
        return React.createElement(tag, { ...toReactAttrs(attrs || {}), key: i });
      })
    : null;
  return React.createElement(
    "svg",
    { ...SVG_DEFAULTS, width: size, height: size, strokeWidth, "aria-hidden": true, className: ("as-icon " + (spin ? "as-icon--spin " : "") + className).trim(), style, ...props },
    children
  );
}
