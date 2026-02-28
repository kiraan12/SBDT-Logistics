
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { shipmentService } from "@/services/api";
import {
  Loader2,
  ArrowLeft,
  Printer,
  FileDown,
  Upload,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type PdfCopy = "all" | "booking" | "pod" | "office";

export default function PortalPrintShipment() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [printCopy, setPrintCopy] = useState<PdfCopy>("all");
  const [podFiles, setPodFiles] = useState<File[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const pdfCopy = printCopy;

  const hasValidId = id && id !== "undefined" && id !== "null";
  const { data: shipment, isLoading, isError } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => shipmentService.getById(id!),
    enabled: !!hasValidId,
  });

  useEffect(() => {
    if (!id) return;

    let urlToRevoke: string | null = null;

    const fetchPdf = async () => {
      try {
        const { blob, filename } = await shipmentService.downloadPdf(id, pdfCopy);

        const baseName = filename?.trim()
          ? filename.trim()
          : `shipment_${id}_${pdfCopy}`;

        const finalName = baseName.toLowerCase().endsWith(".pdf")
          ? baseName
          : `${baseName}.pdf`;

        const file = new File([blob], finalName, { type: "application/pdf" });

        const url = window.URL.createObjectURL(file);
        urlToRevoke = url;
        setPdfBlobUrl(url);
      } catch (error) {
        console.error("Failed to load PDF:", error);
        setPdfBlobUrl(null);
      }
    };

    fetchPdf();

    return () => {
      if (urlToRevoke) window.URL.revokeObjectURL(urlToRevoke);
    };
  }, [id, pdfCopy]);

  const uploadPodMutation = useMutation({
    mutationFn: (files: File[]) => shipmentService.uploadPod(id!, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      setPodFiles([]);
    },
    onError: (e: any) => alert(e?.response?.data?.detail || "Upload failed."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { delivery_status: string; actual_delivery_date?: string }) =>
      shipmentService.update(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shipment", id] }),
    onError: (e: any) => alert(e?.response?.data?.detail || "Update failed."),
  });

  const printDirectMutation = useMutation({
    mutationFn: () => shipmentService.printDirect(id!, pdfCopy),
    onSuccess: () => alert("Sent to printer."),
    onError: (e: any) => alert(e?.response?.data?.detail || "Direct print failed. Ensure the backend runs on the PC connected to the printer."),
  });

  if (!hasValidId) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center space-y-6 animate-page-enter">
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
          <XCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-foreground italic tracking-tighter">Invalid shipment link</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">The shipment ID is missing or invalid.</p>
        <Link to="/portal/shipments" className="btn-premium px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest inline-block">Back to shipments</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-4 animate-pulse">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Loading...</span>
      </div>
    );
  }

  if (isError || !shipment) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center space-y-6 animate-page-enter">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-foreground italic tracking-tighter">Shipment not found.</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">The requested shipment could not be found.</p>
        <Link to="/portal/shipments" className="btn-premium px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest inline-block">Back to shipments</Link>
      </div>
    );
  }

  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    /* Print the current page; CSS hides everything except the PDF iframe (no popup). */
    window.print();
  };

  const handleDownload = async (copy: PdfCopy = pdfCopy) => {
    try {
      const { blob, filename } = await shipmentService.downloadPdf(id!, copy);
      const baseName = filename?.trim() ? filename.trim() : `shipment_${id}_${copy}`;
      const finalFilename = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
      const url = window.URL.createObjectURL(new File([blob], finalFilename, { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 200);
    } catch (error) {
      alert("Download protocol failed.");
    }
  };

  const handleDownloadAllPods = async () => {
    try {
      const { blob, filename } = await shipmentService.downloadAllPods(id!);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 200);
    } catch (error) {
      alert("Download all PODs failed.");
    }
  };

  const hasPod = shipment.files?.some((f: any) => f.file_type === "POD");
  const isDelivered = shipment.delivery_status === "DELIVERED";
  const isCancelled = shipment.delivery_status === "CANCELLED";
  const canChangeStatus = !isDelivered && !isCancelled;
  const canMarkDelivered = canChangeStatus && hasPod;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-page-enter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="flex items-center gap-6">
          <Link
            to="/portal/shipments"
            className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-foreground tracking-tighter italic">Print <span className="text-gradient">Shipment</span></h1>
            <p className="text-muted-foreground font-medium font-inter">
              LR No: <span className="text-foreground font-black">{shipment.lr_no}</span> · Status: <span className="text-primary font-black uppercase text-[10px] tracking-widest">{shipment.delivery_status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Print copies & POD verification cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Print copies */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h3 className="text-base font-bold text-foreground mb-4">Print copies</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPrintCopy("all")}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  printCopy === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                )}
              >
                All copies
              </button>
              <button
                type="button"
                onClick={() => setPrintCopy("booking")}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  printCopy === "booking"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                )}
              >
                Booking Copy
              </button>
              <button
                type="button"
                onClick={() => setPrintCopy("pod")}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  printCopy === "pod"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                )}
              >
                Proof of delivery
              </button>
              <button
                type="button"
                onClick={() => setPrintCopy("office")}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  printCopy === "office"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                )}
              >
                Office Copy
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleDownload(pdfCopy)}
                className="flex-1 min-w-[100px] bg-white border border-border py-3 rounded-lg text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/50 transition-all"
              >
                <FileDown className="w-4 h-4" />
                Download
              </button>
              <button
                type="button"
                onClick={() => printDirectMutation.mutate()}
                disabled={printDirectMutation.isPending}
                className="flex-1 min-w-[120px] bg-emerald-600 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {printDirectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Print directly
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!pdfBlobUrl}
                className="flex-1 min-w-[100px] bg-slate-600 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="w-4 h-4" />
                Print (dialog)
              </button>
            </div>
          </div>

        {/* Proof of delivery verification */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h3 className="text-base font-bold text-foreground mb-1">Proof of delivery verification</h3>
            <p className="text-muted-foreground text-sm mb-4">Re-upload the signed proof of delivery copy for verification.</p>
            {hasPod && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-emerald-700">POD uploaded</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                id="pod-upload-portal"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files).slice(0, 15) : [];
                  setPodFiles(files);
                }}
              />
              <label
                htmlFor="pod-upload-portal"
                className="px-4 py-2.5 bg-white border border-border rounded-lg text-sm font-medium text-foreground cursor-pointer hover:bg-muted/50 transition-all"
              >
                Choose Files (max 15)
              </label>
              <span className="text-sm text-muted-foreground">
                {podFiles.length === 0
                  ? "No files chosen"
                  : podFiles.length === 1
                  ? podFiles[0].name
                  : `${podFiles.length} files selected`}
              </span>
            </div>
            <button
              type="button"
              disabled={podFiles.length === 0 || uploadPodMutation.isPending}
              onClick={() => podFiles.length > 0 && uploadPodMutation.mutate(podFiles)}
              className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploadPodMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload POD
            </button>
            {hasPod && (
              <button
                type="button"
                onClick={handleDownloadAllPods}
                className="mt-3 w-full bg-white border border-border text-foreground py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/60 transition-all"
              >
                <FileDown className="w-4 h-4" />
                Download all PODs (ZIP)
              </button>
            )}

            <div className="mt-6 pt-5 border-t border-border">
              <h4 className="text-base font-bold text-foreground mb-3">Mark status</h4>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!canMarkDelivered}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      delivery_status: "DELIVERED",
                      actual_delivery_date: new Date().toISOString(),
                    })
                  }
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Mark Delivered
                </button>
                <button
                  type="button"
                  disabled={!canChangeStatus}
                  onClick={() => updateStatusMutation.mutate({ delivery_status: "CANCELLED" })}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Mark Cancelled
                </button>
              </div>
              {!hasPod && canChangeStatus && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Upload POD to enable Mark Delivered
                </p>
              )}
            </div>
          </div>
      </div>

      {/* PDF document – below Print copies & POD verification */}
      <div className="mt-8">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm relative min-h-[520px]">
          {pdfBlobUrl ? (
            <iframe
              id="pdf-frame"
              src={`${pdfBlobUrl}#toolbar=0`}
              className="w-full h-full min-h-[520px]"
              title="LR PDF (3 copies)"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading PDF...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
