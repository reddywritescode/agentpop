/**
 * Single-line text field. `mono` for IDs, keys, endpoints, commands; helper text lives
 * outside the field (13px, --text-secondary). Labels are sentence case with "(optional)" suffix.
 * @startingPoint section="Components" subtitle="Adornments, invalid, mono, disabled" viewport="700x240"
 */
export interface InputProps {
  /** Visual error state (also sets aria-invalid). */
  invalid?: boolean;
  /** Element inside the field, before the input (e.g. <Icon name="search" />). */
  leading?: any;
  /** Element inside the field, after the input. */
  trailing?: any;
  /** Monospace — for IDs, keys, endpoints, commands. */
  mono?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  type?: string;
  className?: string;
  style?: any;
}
export declare const Input: (props: InputProps) => any;
