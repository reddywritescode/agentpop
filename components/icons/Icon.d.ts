/**
 * Lucide icon by kebab-case name. Stroke 2px, round caps — the only icon system.
 * Requires the lucide UMD script (see Icon.prompt.md). Never use emoji or hand-drawn SVG instead.
 */
export interface IconProps {
  /** Kebab-case lucide name, e.g. "circle-check", "trash-2", "loader". */
  name: string;
  /** Square size in px. 16 in buttons/rows; 12–14 inside badges. Default 16. */
  size?: number;
  /** Stroke width. Default 2. */
  strokeWidth?: number;
  /** Rotate continuously (in-progress states). */
  spin?: boolean;
  className?: string;
  style?: any;
}
export declare function Icon(props: IconProps): any;
