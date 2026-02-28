
import { useQuery } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import type { Shipment, DeliveryStatus } from "@/types";
import { Link } from "react-router-dom";
import { Printer, Search, FileText, Pencil, Package, ArrowRight } from "lucide-react";
import { useState } from "react";
import { SkeletonTableRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function PortalShipments() {
  const [search, setSearch] = useState("");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["portal-shipments", search],
    queryFn: () => shipmentService.getAll({ search }),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter italic">Personal <span className="text-gradient">Registry.</span></h1>
          <p className="text-slate-500 font-medium font-inter uppercase tracking-[0.2em] text-[10px]">Audit your scanned deployments</p>
        </div>

        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input
            type="search"
            placeholder="Scan by LR No, Personnel, Node..."
            className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl border-border overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">LR No</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Consignor</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Consignee</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonTableRow key={i} cols={5} />
                ))}
              </tbody>
            </table>
          </div>
        ) : !shipments?.length ? (
          <div className="p-20 text-center">
            <EmptyState
              icon={Package}
              title="Sector Empty"
              description="No shipment signatures found in this frequency. Deploy a scan to initialize."
              action={
                <Link
                  to="/portal/scan"
                  className="btn-premium px-8 py-4 text-primary-foreground rounded-xl shadow-md transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <ScanLine className="w-4 h-4" />
                  Initialize New Scan
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">LR No</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Consignor</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Consignee</th>
                  <th className="px-6 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shipments.map((s: Shipment) => (
                  <tr key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                          <FileText className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-foreground italic tracking-tighter">{s.lr_no}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{s.ship_date || "UNDEFINED"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-sm font-bold text-slate-300 tracking-tight">{s.consignor_name}</p>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[150px]">{s.source || "GND"}</p>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-sm font-bold text-slate-300 tracking-tight">{s.consignee_name}</p>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[150px]">{s.destination || "GND"}</p>
                    </td>
                    <td className="px-6 py-6">
                      <StatusBadge status={s.delivery_status as DeliveryStatus} />
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/portal/shipments/${s.id}/edit`}
                          className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
                          title="Edit Registry"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/portal/shipments/${s.id}/print`}
                          className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
                          title="Generate Manifest"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/portal/shipments/${s.id}/print`}
                          className="px-4 py-2 rounded-lg bg-muted border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all ml-2"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const ScanLine = ({ className }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" x2="17" y1="12" y2="12" />
  </svg>
);
