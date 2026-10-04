/**
 * The action button. Primary = one per view (accent); secondary/outline for neutral actions;
 * ghost for toolbars; danger for destructive ("Destroy sandbox"); link for inline navigation.
 * @startingPoint section="Components" subtitle="Primary, secondary, ghost, danger, link — 3 sizes + icon buttons" viewport="700x260"
 */
export interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline" | "link";
  /** sm 32px / md 36px / lg 44px; icon-* are square. Default md. */
  size?: "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";
  /** Show a spinner and disable interaction. Label stays ("Creating…"). */
  loading?: boolean;
  /** Icon rendered before the label (16px lucide). */
  leadingIcon?: any;
  /** Icon rendered after the label. */
  trailingIcon?: any;
  disabled?: boolean;
  onClick?: (e: any) => void;
  className?: string;
  children?: any;
}
export declare const Button: (props: ButtonProps) => any;
