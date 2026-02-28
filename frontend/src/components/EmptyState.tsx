
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

/**
 * Premium empty state with illustration placeholder (Lottie-ready).
 * Use data-slot="lottie-placeholder" for future Lottie replacement.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  illustrationSlot,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Optional: custom illustration (e.g. Lottie container) */
  illustrationSlot?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-[3rem] border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent px-8 py-20 text-center overflow-hidden group",
        className
      )}
    >
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <div
        className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-white/[0.03] shadow-2xl ring-1 ring-white/10 group-hover:ring-primary/30 transition-all duration-700 group-hover:rotate-3"
        data-slot="lottie-placeholder"
      >
        <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        {illustrationSlot ?? (
          Icon ? (
            <Icon className="relative h-14 w-14 text-slate-500 group-hover:text-primary transition-colors duration-500" />
          ) : (
            <Info className="relative h-14 w-14 text-slate-500 group-hover:text-primary transition-colors duration-500" />
          )
        )}
      </div>

      <div className="relative z-10 space-y-3">
        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase px-4 leading-tight">
          {title}
        </h3>
        {description && (
          <p className="max-w-xs text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] leading-relaxed mx-auto">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="relative z-10 mt-10">
          {action}
        </div>
      )}

      {/* Subtle Corner Accents */}
      <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-white/10" />
      <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-white/10" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-white/10" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-white/10" />
    </div>
  );
}
