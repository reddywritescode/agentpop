import * as React from "react";
import { icons, HelpCircle, type LucideProps } from "lucide-react";

/**
 * Name-addressed icon, so markup ported from the design kit keeps reading
 * `<Icon name="box" />`. Names are the kebab-case lucide identifiers; unknown
 * names fall back to a help glyph rather than crashing.
 */
export interface IconProps extends Omit<LucideProps, "ref"> {
  name: string;
  size?: number;
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function Icon({ name, size = 16, ...props }: IconProps) {
  const key = toPascalCase(name) as keyof typeof icons;
  const Cmp = icons[key] ?? HelpCircle;
  return <Cmp size={size} {...props} />;
}
