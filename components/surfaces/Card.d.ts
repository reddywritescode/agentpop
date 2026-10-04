/**
 * Surface card: 16px radius, 1px border, xs shadow. Variants: default, elevated (popovers),
 * flat, inset (nested wells). `interactive` darkens the border on hover.
 * Compose with CardHeader/CardTitle/CardDescription/CardContent/CardFooter.
 * @startingPoint section="Components" subtitle="Default, elevated, flat, inset + header/content/footer" viewport="700x240"
 */
export interface CardProps {
  variant?: "default" | "elevated" | "flat" | "inset";
  /** Hover darkens border; use for clickable cards (e.g. resource size picker). */
  interactive?: boolean;
  className?: string;
  onClick?: (e: any) => void;
  children?: any;
}
export declare const Card: (props: CardProps) => any;
export declare const CardHeader: (props: any) => any;
export declare const CardTitle: (props: any) => any;
export declare const CardDescription: (props: any) => any;
export declare const CardContent: (props: any) => any;
export declare const CardFooter: (props: any) => any;
