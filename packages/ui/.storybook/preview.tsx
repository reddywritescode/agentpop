import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";

// Real brand fonts (Vite resolves and bundles these for the Storybook build).
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

// The compiled design system: tokens + Tailwind layers + base.
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          "Foundations",
          "Primitives",
          "Forms",
          "Data Display",
          "Feedback",
          "Navigation",
          "Overlays",
          "Product",
        ],
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    (Story) => (
      <div className="bg-surface-canvas text-text-primary font-sans p-8">
        <Story />
      </div>
    ),
  ],
};

export default preview;
