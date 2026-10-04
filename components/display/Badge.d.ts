/**
 * Pill badge for labels, counts, tags, and tones. For lifecycle state, use StatusBadge instead.
 * @startingPoint section="Components" subtitle="7 tones × 2 sizes, optional icon" viewport="700x180"
 */
export interface BadgeProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "outline";
  /** sm 20px / md 24px. Default md. */
  size?: "sm" | "md";
  /** Optional leading icon (12–14px lucide). */
  icon?: any;
  className?: string;
  children?: any;
}
export declare const Badge: (props: BadgeProps) => any;
