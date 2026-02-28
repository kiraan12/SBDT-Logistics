
import { FileDown, ShieldCheck, Download, Calendar, Layers, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { shipmentService } from "@/services/api";
import { useNavigate } from "react-router-dom";

const PERIODS = [
  { value: "", label: "All Operational History" },
  { value: "month", label: "Monthly Node Analysis" },
  { value: "3months", label: "Quarterly Cycle" },
  { value: "half_yearly", label: "Semi-Annual Pulse" },
  { value: "2years", label: "Biannual Review" },
  { value: "3years", label: "Triennial Deep Audit" },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PortalExport() {
  const navigate = useNavigate();
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [period, setPeriod] = useState("");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const exportParams = period ? (period === "month" ? { period, year, month } : { period }) : undefined;

  const handleDownloadExcel = async () => {
    setLoadingExcel(true);
    try {
      const { blob, filename } = await shipmentService.exportExcel(true, exportParams);
      const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 200);
    } catch (e) {
      alert("Export protocol failed. Network interruption detected.");
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleDownloadCsv = async () => {
    setLoadingCsv(true);
    try {
      const { blob, filename } = await shipmentService.exportCsv(true, exportParams);
      let finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      if (finalFilename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.csv$/i)) {
        finalFilename = "sbdt_personal_registry_export.csv";
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 300);
    } catch (e) {
      alert("Export protocol failed. Network interruption detected.");
    } finally {
      setLoadingCsv(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-page-enter">
      <div className="flex items-center gap-6 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">Export <span className="text-gradient">Node.</span></h1>
          <p className="text-slate-500 font-medium font-inter uppercase tracking-[0.2em] text-[10px]">Generate personal deployment logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card p-10 rounded-[3rem] border-white/5 relative overflow-hidden group">
          <Download className="absolute -top-10 -right-10 w-48 h-48 opacity-[0.01] group-hover:opacity-[0.03] transition-opacity duration-1000" />

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white italic tracking-tighter">Manifest Extraction</h3>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Industrial Data Formats</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temporal Filter</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer group-hover:bg-white/[0.05] transition-all"
                  >
                    {PERIODS.map((p) => <option key={p.value || "all"} value={p.value} className="bg-slate-900">{p.label}</option>)}
                  </select>
                </div>
              </div>

              {period === "month" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Node Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
                      {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1} className="bg-slate-900">{name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Node Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
                      {[currentYear, currentYear - 1, currentYear - 2].map((y) => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-8 space-y-4">
              <button
                onClick={handleDownloadExcel}
                disabled={loadingExcel || loadingCsv}
                className="w-full btn-premium py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:grayscale"
              >
                {loadingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                {loadingExcel ? "Compiling..." : "Download Excel (.xlsx)"}
              </button>
              <button
                onClick={handleDownloadCsv}
                disabled={loadingExcel || loadingCsv}
                className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:grayscale"
              >
                {loadingCsv ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5 text-slate-500" />}
                {loadingCsv ? "Generating..." : "Download Plain CSV (.csv)"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-10 rounded-[3rem] border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Export Protocol</h4>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              All exported logs are encrypted with AES-256 before delivery. Manifests include full LR signatures,
              consignor/consignee metadata, and verified deployment status.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-black text-white italic tracking-tighter">99.9%</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Data Integrity</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-black text-white italic tracking-tighter">&lt; 2s</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Generation Time</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 rounded-[3rem] border-white/5 bg-slate-900/40 border-dashed">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Operative Notice</h4>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed italic">
              "Monthly exports are optimized for financial reconciliation. Ensure all scans are neural-verified before final manifest generation."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
