import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's class helper. Only the primitives in components/ui use it. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
