
import { useState } from "react";
import { FileDown, Loader2, Database, ShieldCheck, Zap, Calendar, Filter } from "lucide-react";
import { shipmentService } from "@/services/api";

const PERIODS = [
    { value: "", label: "All time" },
    { value: "month", label: "Monthly" },
    { value: "3months", label: "Last 3 months" },
    { value: "half_yearly", label: "Half-yearly (6 months)" },
    { value: "2years", label: "2 years" },
    { value: "3years", label: "3 years" },
] as const;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Exports() {
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [loadingCsv, setLoadingCsv] = useState(false);
    const [period, setPeriod] = useState<string>("");
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const exportParams = period ? (period === "month" ? { period, year, month } : { period }) : undefined;

    const handleDownloadExcel = async () => {
        setLoadingExcel(true);
        try {
            const { blob, filename } = await shipmentService.exportExcel(false, exportParams);
            const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = finalFilename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 200);
        } catch (error) {
            alert("Export protocol failed. Please verify system permissions.");
        } finally {
            setLoadingExcel(false);
        }
    };

    const handleDownloadCsv = async () => {
        setLoadingCsv(true);
        try {
            const { blob, filename } = await shipmentService.exportCsv(false, exportParams);
            let finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
            if (finalFilename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.csv$/i)) {
                finalFilename = "shipments_export.csv";
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = finalFilename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 300);
        } catch (error) {
            alert("Export protocol failed. Please verify system permissions.");
        } finally {
            setLoadingCsv(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-16 pb-20 animate-page-enter relative">
            {/* Advanced Background System */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[140px]" />

                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.01]" />
            </div>

            <div className="relative z-10 space-y-16">
                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black tracking-tighter text-white italic">Data <span className="text-gradient">Intelligence.</span></h1>
                    <p className="text-slate-500 font-medium max-w-xl mx-auto font-inter">
                        Generate highly granular operational reports and export mission-critical logistics data for external analysis.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Export Config Card */}
                    <div className="lg:col-span-2 glass-card p-12 rounded-[4rem] relative overflow-hidden group bg-black/20">
                        {/* Tactical Corner Borders */}
                        <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-primary/20 rounded-tl-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />
                        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-primary/20 rounded-br-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <Database className="w-64 h-64 rotate-12" />
                        </div>

                        <div className="relative z-10 space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                                    <FileDown className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic tracking-tight">Report Synthesis</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure extraction parameters</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <Filter className="w-3 h-3" />
                                        Temporal Scope
                                    </label>
                                    <select
                                        value={period}
                                        onChange={(e) => setPeriod(e.target.value)}
                                        className="w-full bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all appearance-none"
                                    >
                                        {PERIODS.map((p) => (
                                            <option key={p.value || "all"} value={p.value} className="bg-[#020617]">{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {period === "month" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                <Calendar className="w-3 h-3" />
                                                Month
                                            </label>
                                            <select
                                                value={month}
                                                onChange={(e) => setMonth(Number(e.target.value))}
                                                className="w-full bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all appearance-none"
                                            >
                                                {MONTH_NAMES.map((name, i) => (
                                                    <option key={i} value={i + 1} className="bg-[#020617]">{name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                <Calendar className="w-3 h-3" />
                                                Year
                                            </label>
                                            <select
                                                value={year}
                                                onChange={(e) => setYear(Number(e.target.value))}
                                                className="w-full bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all appearance-none"
                                            >
                                                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                                                    <option key={y} value={y} className="bg-[#020617]">{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={handleDownloadExcel}
                                    disabled={loadingExcel || loadingCsv}
                                    className="flex-1 btn-premium px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:grayscale transition-all"
                                >
                                    {loadingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                    Synthesis Excel
                                </button>
                                <button
                                    onClick={handleDownloadCsv}
                                    disabled={loadingExcel || loadingCsv}
                                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 px-8 py-4 rounded-2xl text-slate-300 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all disabled:opacity-30"
                                >
                                    {loadingCsv ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                    Export CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="space-y-8">
                        <div className="glass-card p-10 rounded-[3.5rem] space-y-8 relative overflow-hidden group bg-black/20">
                            {/* Tactical Corners */}
                            <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-white/10 rounded-tl-[3.5rem] pointer-events-none group-hover:border-primary/30 transition-colors" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-white/10 rounded-br-[3.5rem] pointer-events-none group-hover:border-primary/30 transition-colors" />
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Secure Handshake</h4>
                                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                    All exports are encrypted in transit and follow strict data sovereignty protocols.
                                </p>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Real-time Buffer</h4>
                                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                    Deployment data is synced every 60 seconds with our global logistics nodes.
                                </p>
                            </div>
                        </div>

                        <div className="p-1 px-8 rounded-full border border-white/5 bg-white/[0.02] text-center">
                            <span className="text-[10px] font-black text-slate-600 tracking-[0.3em] uppercase italic">System Version 4.0.2-Build</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
