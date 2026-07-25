import type { Config } from "tailwindcss";

/**
 * AgentPop Tailwind preset.
 *
 * Consumers (this repo's app, and any design built on the system) spread this
 * into their `tailwind.config`. It wires the semantic tokens from tokens.css to
 * utility classes so authors write `bg-surface-1 text-secondary border-default`
 * instead of raw colors. Every color below resolves to a `var(--token)`.
 */
const preset = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: "var(--surface-canvas)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          inset: "var(--surface-inset)",
          overlay: "var(--surface-overlay)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
          inverse: "var(--text-inverse)",
        },
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          inverse: "var(--border-inverse)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          fg: "var(--accent-fg)",
          text: "var(--accent-text)",
          "subtle-bg": "var(--accent-subtle-bg)",
          "subtle-border": "var(--accent-subtle-border)",
          "subtle-text": "var(--accent-subtle-text)",
        },
        success: {
          fg: "var(--success-fg)",
          bg: "var(--success-bg)",
          border: "var(--success-border)",
          solid: "var(--success-solid)",
        },
        warning: {
          fg: "var(--warning-fg)",
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
          solid: "var(--warning-solid)",
        },
        danger: {
          fg: "var(--danger-fg)",
          bg: "var(--danger-bg)",
          border: "var(--danger-border)",
          solid: "var(--danger-solid)",
          hover: "var(--danger-hover)",
        },
        info: {
          fg: "var(--info-fg)",
          bg: "var(--info-bg)",
          border: "var(--info-border)",
          solid: "var(--info-solid)",
        },
        neutral: {
          fg: "var(--neutral-fg)",
          bg: "var(--neutral-bg)",
          border: "var(--neutral-border)",
          solid: "var(--neutral-solid)",
        },
        code: {
          bg: "var(--code-bg)",
          fg: "var(--code-fg)",
        },
        ring: "var(--ring)",
        scrim: "var(--scrim)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        overlay: "var(--shadow-overlay)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      ringColor: {
        DEFAULT: "var(--ring)",
      },
      fontSize: {
        // Compact, technical scale (rem @ 16px base)
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px
        xs: ["0.75rem", { lineHeight: "1.125rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        base: ["0.875rem", { lineHeight: "1.375rem" }], // 14px — UI default
        md: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
        lg: ["1.0625rem", { lineHeight: "1.625rem" }], // 17px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }], // 30px
      },
    },
  },
  plugins: [],
} satisfies Config;

export default preset;
