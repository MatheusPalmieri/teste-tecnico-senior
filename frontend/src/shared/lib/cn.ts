import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Sem isso, o tailwind-merge trata `text-small` como cor e descarta `text-white`. */
const FONT_SIZES = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "body-strong",
  "small",
  "caption",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
