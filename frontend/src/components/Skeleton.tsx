import { cn } from "@/lib/utils";

/**
 * Skeleton loader – loading must never feel static.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      aria-hidden
    />
  );
}

/** Table row skeleton for shipments list */
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-5 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Card skeleton for dashboard-style cards */
export function SkeletonCard() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-card/40 backdrop-blur-md p-8">
      <div className="flex items-center gap-6">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

