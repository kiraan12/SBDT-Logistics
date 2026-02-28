
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, Loader2, AlertCircle, FileText, RefreshCw, Scan, Sparkles, Wand2, Zap, ShieldCheck } from "lucide-react";
import { scanService } from "@/services/api";
import { useNavigate, useLocation } from "react-router-dom";
import ShipmentForm from "@/components/ShipmentForm";
import { cn } from "@/lib/utils";

export default function NewScan() {
    const [file, setFile] = useState<File | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<any>(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isPortal = pathname.startsWith("/portal");
    const isManager = pathname.startsWith("/manager");
    const isOwner = pathname.startsWith("/owner");

    const uploadMutation = useMutation({
        mutationFn: scanService.upload,
        onSuccess: (data) => {
            setJobId(data.id);
        },
    });

    const jobQuery = useQuery({
        queryKey: ["scanJob", jobId],
        queryFn: () => scanService.getJob(jobId!),
        enabled: !!jobId && !extractedData,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "COMPLETED" || data?.status === "FAILED") {
                return false;
            }
            return 2000;
        },
    });

    useEffect(() => {
        if (jobQuery.data?.status === "COMPLETED") {
            const raw = jobQuery.data.extracted_data;
            const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
            const normalized = { ...parsed };
            if (parsed.sender_address != null && parsed.consignor_address == null) {
                normalized.consignor_address = String(parsed.sender_address).trim();
            }
            if (parsed.receiver_address != null && parsed.consignee_address == null) {
                normalized.consignee_address = String(parsed.receiver_address).trim();
            }
            setExtractedData(normalized);
        }
    }, [jobQuery.data]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const handleManualEntry = () => {
        setExtractedData({});
    };

    const handleTryAgain = () => {
        setJobId(null);
        setFile(null);
        setExtractedData(null);
        uploadMutation.reset();
    };

    const hasMeaningfulExtraction = extractedData && typeof extractedData === "object" && (
        (extractedData.lr_no && extractedData.lr_no.trim()) ||
        (extractedData.inv_no && extractedData.inv_no.trim()) ||
        (extractedData.vehicle_no && extractedData.vehicle_no.trim()) ||
        (extractedData.consignor_name && extractedData.consignor_name.trim()) ||
        (extractedData.consignee_name && extractedData.consignee_name.trim())
    );

    if (extractedData) {
        return (
            <div className="space-y-12 animate-page-enter max-w-5xl mx-auto pb-32 relative">
                {/* Advanced Background System */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[140px]" />

                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                    <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.01]" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">Verify <span className="text-gradient font-black">Intelligence.</span></h1>
                                {jobId && hasMeaningfulExtraction && (
                                    <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 animate-pulse">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI Confirmed
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-500 font-medium font-inter tracking-tight text-lg">Validate the extracted parameters before committing to global registry.</p>
                        </div>
                    </div>

                    <div className="mb-8 p-6 rounded-2xl bg-white border border-border">
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-primary" />
                            LR & Shipment Details
                        </h2>
                        <p className="text-muted-foreground text-sm font-medium">
                            Review and correct the fields below. Required fields are validated before commit to the global registry.
                        </p>
                    </div>

                    {!hasMeaningfulExtraction && jobId && (
                        <div className="glass-card border-amber-500/20 p-8 rounded-[2rem] flex items-center gap-6 bg-amber-500/[0.03] overflow-hidden group relative">
                            <div className="absolute inset-0 bg-amber-500/[0.02] group-hover:bg-amber-500/[0.04] transition-colors" />
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-xl shadow-amber-500/10 relative z-10">
                                <AlertCircle className="w-7 h-7 text-amber-500" />
                            </div>
                            <div className="relative z-10 space-y-1">
                                <p className="text-white font-black italic text-lg">Limited Extraction Yield.</p>
                                <p className="text-sm text-slate-400 font-medium">
                                    AI extraction yields were below nominal thresholds. Manual verification and entry required for mission integrity.
                                </p>
                            </div>
                        </div>
                    )}

                    <ShipmentForm
                        initialData={extractedData}
                        submitLabel="Create Shipment"
                        onSuccess={(shipmentId: string) => {
                            if (isManager) navigate("/manager");
                            else if (isOwner) navigate(`/owner/shipments/${shipmentId}/print`);
                            else if (isPortal) navigate(`/portal/shipments/${shipmentId}/print`);
                            else navigate(`/shipments/${shipmentId}/print`);
                        }}
                        showCompanyAssign={isPortal}
                        onCancel={handleTryAgain}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-page-enter py-16 relative">
            {/* Advanced Background System */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[140px]" />

                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.01]" />
            </div>

            <div className="relative z-10 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Advanced OCR Node Active</span>
                </div>
                <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
                    Neural <span className="text-gradient font-black">Ingestion.</span>
                </h1>
                <p className="text-slate-500 font-medium max-w-xl mx-auto font-inter text-lg tracking-tight">
                    Upload logistics documentation (E-Way Bills, Invoices) for automated field extraction and real-time registry synchronization.
                </p>
            </div>

            <div className="glass-card rounded-[4rem] p-16 relative overflow-hidden group border-white/5 shadow-2xl bg-black/20">
                {/* Tactical Corner Borders */}
                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/20 rounded-tl-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/20 rounded-br-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />

                {/* Active Scanning Lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-full group-hover:animate-scan" />

                <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 transform group-hover:rotate-12 group-hover:scale-125">
                    <Scan className="w-80 h-80" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                    {/* Left: Upload Zone */}
                    <div className="space-y-8">
                        <div
                            className={cn(
                                "relative rounded-[3rem] border-2 border-dashed transition-all duration-700 group/upload flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-full p-12 overflow-hidden",
                                file
                                    ? "bg-primary/[0.07] border-primary/50 shadow-2xl shadow-primary/10"
                                    : "bg-white/[0.02] border-white/10 hover:border-primary/50 hover:bg-white/[0.04] shadow-xl hover:shadow-2xl"
                            )}
                        >
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                capture="environment"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                onChange={handleFileChange}
                            />

                            <div className="flex flex-col items-center gap-8 text-center relative z-10">
                                <div className={cn(
                                    "w-28 h-28 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl relative",
                                    file ? "bg-primary text-white scale-110 rotate-3 shadow-primary/30" : "bg-white/5 text-slate-500 group-hover/upload:text-primary group-hover/upload:scale-110 group-hover/upload:-rotate-3"
                                )}>
                                    {file ? <FileText className="w-14 h-14" /> : <Upload className="w-14 h-14" />}
                                    {!file && (
                                        <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover/upload:opacity-100 transition-opacity rounded-full" />
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-2xl font-black text-white italic tracking-tight uppercase">
                                        {file ? "Protocol Ready." : "Source File."}
                                    </p>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] max-w-[220px] leading-loose">
                                        {file ? file.name : "Drop PNG, JPG or PDF protocol for high-fidelity ingestion"}
                                    </p>
                                </div>
                            </div>

                            {/* Decorative corner accents */}
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/10 group-hover/upload:border-primary/40 transition-colors" />
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/10 group-hover/upload:border-primary/40 transition-colors" />
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/10 group-hover/upload:border-primary/40 transition-colors" />
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/10 group-hover/upload:border-primary/40 transition-colors" />
                        </div>
                    </div>

                    {/* Right: Actions & Status */}
                    <div className="flex flex-col justify-center space-y-12">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] flex items-center gap-3">
                                    <Wand2 className="w-4 h-4" />
                                    Protocol Control
                                </h3>
                                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                            </div>

                            <div className="space-y-5">
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || uploadMutation.isPending || !!jobId}
                                    className="w-full btn-premium py-6 rounded-[2rem] text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 disabled:grayscale transition-all active:scale-95 group/btn"
                                >
                                    {uploadMutation.isPending || (jobId && jobQuery.isLoading) ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {jobId ? "Synthesizing Node..." : "Ingesting Data..."}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 group-hover/btn:animate-pulse" />
                                            Launch AI Extraction
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleManualEntry}
                                    className="w-full bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] py-6 rounded-[2rem] text-slate-400 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group/manual"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 group-hover/manual:rotate-180 transition-transform duration-700" />
                                    Bypass AI & Manual Entry
                                </button>
                            </div>
                        </div>

                        {/* Visual Feedback / Instruction */}
                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
                            <div className="flex items-center gap-3 text-primary">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] font-inter">Neural Engine Active</span>
                            </div>
                            <p className="text-slate-400 text-xs font-semibold leading-relaxed italic font-inter">
                                "Our advanced vision nodes identify invoice numbers, LR references, and regional routing targets with enterprise-grade accuracy."
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">AES-256 In-Transit Encryption</span>
                            </div>
                        </div>

                        {jobId && jobQuery.data && jobQuery.data.status === "FAILED" && (
                            <div className="p-8 bg-red-500/[0.03] border border-red-500/20 rounded-[2.5rem] space-y-6 animate-shake">
                                <div className="space-y-2 text-center">
                                    <p className="text-red-400 text-xs font-black uppercase tracking-[0.3em]">Critical Extraction Failure</p>
                                    <p className="text-[10px] text-slate-500 font-bold">The neural node could not parse the source protocol.</p>
                                </div>
                                <button
                                    onClick={handleTryAgain}
                                    className="w-full bg-red-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Recalibrate Source
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
