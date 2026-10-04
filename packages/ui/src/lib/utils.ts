import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names — later classes win over earlier conflicting ones.
 * The one class-composition helper used across every AgentPop component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
