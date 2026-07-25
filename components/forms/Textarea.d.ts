/**
 * Multi-line text field; `mono` for Dockerfiles, JSON, and code-like content.
 */
export interface TextareaProps {
  invalid?: boolean;
  /** Monospace — Dockerfiles, code, JSON. */
  mono?: boolean;
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  className?: string;
}
export declare const Textarea: (props: TextareaProps) => any;
