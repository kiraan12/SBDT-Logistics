import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps page content with a light page transition (fade + slight upward motion).
 * Performance-first: CSS-only animation.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-page-enter", className)}>
      {children}
    </div>
  );
}
