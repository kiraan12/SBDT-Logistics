
import { Link } from "react-router-dom";
import { ScanLine, FileText, ArrowRight, Truck, ShieldCheck, Activity, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import type { Shipment } from "@/types";
import { cn } from "@/lib/utils";

export default function PortalDashboard() {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["portal-shipments"],
    queryFn: () => shipmentService.getAll({ limit: 10 }),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-20 animate-page-enter relative pointer-events-auto">
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-16">
        {/* Welcome & Action Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border p-12 lg:p-24 text-center group shadow-sm">
          <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/20 rounded-tl-[2rem] pointer-events-none group-hover:border-primary/40 transition-colors" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-primary/20 rounded-br-[2rem] pointer-events-none group-hover:border-primary/40 transition-colors" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Secure Portal</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-foreground italic tracking-tighter leading-tight">
              READY FOR <br />
              <span className="text-gradient">INGESTION?</span>
            </h1>

            <p className="text-lg text-muted-foreground font-medium font-inter">
              Upload documents (E-Way Bills, Invoices) for field extraction and shipment creation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link
                to="/portal/scan"
                className="w-full sm:w-auto px-10 py-5 btn-premium text-white rounded-2xl shadow-2xl shadow-primary/20 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 group"
              >
                <ScanLine className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Scan / Upload
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/tracking"
                className="w-full sm:w-auto px-10 py-5 bg-muted border border-border text-foreground rounded-2xl hover:bg-muted/80 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"
              >
                <Search className="w-5 h-5" />
                Search Registry
              </Link>
            </div>
          </div>
        </div>

        {/* Grid of Stats & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-8 flex flex-col">
            <div className="glass-card p-10 rounded-2xl border-border relative overflow-hidden group flex-1">
              <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-border rounded-tl-2xl pointer-events-none group-hover:border-primary/30 transition-colors" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-border rounded-br-2xl pointer-events-none group-hover:border-primary/30 transition-colors" />

              <Activity className="absolute -top-6 -right-6 w-32 h-32 opacity-[0.05] text-primary group-hover:opacity-10 transition-opacity" />
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6">Performance</h3>
              <div className="space-y-6">
                <StatItem label="Scans Today" value="12" subtext="+20% vs yesterday" />
                <StatItem label="Active Deliveries" value="48" subtext="8 priority nodes" />
                <StatItem label="Precision Rate" value="99.2%" subtext="Verified" color="text-primary" />
              </div>
            </div>

            <Link
              to="/exports"
              className="block glass-card p-10 rounded-2xl border-border hover:border-primary/30 transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-border rounded-tl-2xl pointer-events-none group-hover:border-primary/30 transition-colors" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-border rounded-br-2xl pointer-events-none group-hover:border-primary/30 transition-colors" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h3 className="text-xl font-black text-foreground italic">Export Hub.</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Generate reports</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-2xl border-border overflow-hidden flex flex-col relative group/table shadow-sm">
          <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/20 rounded-tl-2xl pointer-events-none group-hover/table:border-primary/40 transition-colors" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/20 rounded-br-2xl pointer-events-none group-hover/table:border-primary/40 transition-colors" />

          <div className="px-12 py-10 border-b border-border flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h2 className="text-xl font-black text-foreground italic tracking-tight">Recent Registry.</h2>
            </div>
            <Link
              to="/shipments"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <Truck className="w-4 h-4" />
              Audit All
            </Link>
          </div>

          <div className="flex-1">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Loading...</span>
              </div>
            ) : !shipments?.length ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No shipments yet.</p>
                <Link to="/portal/scan" className="text-primary text-xs font-black uppercase tracking-widest hover:underline">Upload document</Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {shipments.slice(0, 6).map((s: Shipment) => (
                  <Link
                    key={s.id}
                    to={`/portal/shipments/${s.id}/print`}
                    className="px-10 py-5 flex items-center justify-between hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                        <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="font-black text-foreground tracking-tight">{s.lr_no}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {s.consignor_name} <span className="italic px-1">→</span> {s.consignee_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-foreground italic">{s.source}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Source</p>
                      </div>
                      <StatusPill status={s.delivery_status} />
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="px-10 py-6 bg-muted/30 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SBDT Logistics Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, subtext, color = "text-foreground" }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-3">
        <span className={cn("text-3xl font-black italic tracking-tighter", color)}>{value}</span>
        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{subtext}</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const delivered = status === "DELIVERED";
  const intransit = status === "IN_TRANSIT";

  return (
    <span
      className={cn(
        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
        delivered
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : intransit
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-white/5 text-slate-500 border-white/10"
      )}
    >
      {status?.replace("_", " ")}
    </span>
  );
}
