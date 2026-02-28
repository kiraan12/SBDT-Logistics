
import { cn } from "@/lib/utils";

type Status = "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "PROCESSING" | "EXTRACTED" | "FAILED" | string;

/**
 * Status badge with optional pulse while processing/in-transit.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const isProcessing =
    status === "IN_TRANSIT" || status === "PROCESSING" || status === "PENDING";
  const label = status?.replace("_", " ") ?? "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-700 border backdrop-blur-md",
        (status === "DELIVERED" || status === "COMPLETED") &&
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover/badge:bg-emerald-500/20",
        status === "IN_TRANSIT" &&
        "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover/badge:bg-amber-500/20",
        status === "PROCESSING" &&
        "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] group-hover/badge:bg-blue-500/20",
        status === "PENDING" &&
        "bg-slate-500/10 text-slate-400 border-white/10",
        status === "BOOKED" &&
        "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)] group-hover/badge:bg-indigo-500/20",
        status === "EXTRACTED" &&
        "bg-primary/10 text-primary border-primary/30 shadow-[0_0_20px_rgba(129,140,248,0.2)] group-hover/badge:bg-primary/20",
        (status === "CANCELLED" || status === "FAILED") &&
        "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)] group-hover/badge:bg-rose-500/20",
        !["DELIVERED", "COMPLETED", "IN_TRANSIT", "PROCESSING", "PENDING", "BOOKED", "CANCELLED", "FAILED", "EXTRACTED"].includes(status) &&
        "bg-white/[0.03] text-slate-400 border-white/10",
        isProcessing && "animate-pulse-soft shadow-lg shadow-white/5",
        className
      )}
    >
      {isProcessing && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-40 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
        </span>
      )}
      <span className="relative z-10">{label}</span>
    </span>
  );
}

export default StatusBadge

