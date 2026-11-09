import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

// eslint-disable-next-line react-refresh/only-export-components -- padrão shadcn/ui: variantes junto do componente
export const alertVariants = cva("relative w-full rounded-lg border p-4 text-body", {
  variants: {
    variant: {
      default: "border-neutral-200 bg-white text-neutral-800",
      destructive: "border-danger-border bg-danger-bg text-danger-text",
    },
  },
  defaultVariants: { variant: "default" },
});

export const Alert = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 text-body-strong leading-none", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-small text-neutral-600", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
