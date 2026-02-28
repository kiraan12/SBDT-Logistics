import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import type { Shipment } from "@/types";
import { CheckCircle, FileUp, Loader2, Truck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalPodDashboard() {
  const queryClient = useQueryClient();
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["portal-pod-shipments"],
    queryFn: () => shipmentService.getAll({ my_only: true, limit: 200 }),
  });

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});

  const uploadMutation = useMutation({
    mutationFn: async ({ id, files }: { id: string; files: File[] }) =>
      shipmentService.uploadPod(id, files),
    onSuccess: (_data, variables) => {
      setSelectedFiles((prev) => ({ ...prev, [variables.id]: [] }));
      queryClient.invalidateQueries({ queryKey: ["portal-pod-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", variables.id] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      shipmentService.update(id, {
        delivery_status: "DELIVERED",
        actual_delivery_date: new Date().toISOString(),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-pod-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", variables.id] });
    },
  });

  const markCancelledMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      shipmentService.update(id, { delivery_status: "CANCELLED" }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-pod-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", variables.id] });
    },
  });

  const handleFilesChange = (shipmentId: string, filesList: FileList | null) => {
    const files = filesList ? Array.from(filesList).slice(0, 15) : [];
    setSelectedFiles((prev) => ({ ...prev, [shipmentId]: files }));
  };

  const rows = (shipments || []).filter(
    (s: Shipment) => s.delivery_status !== "DELIVERED" && s.delivery_status !== "CANCELLED"
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-page-enter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground italic">
            POD <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload PODs and mark shipments as delivered. Only your shipments are shown here.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Active Shipments
            </span>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            {rows.length} pending
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
              Loading shipments...
            </span>
          </div>
        ) : !rows.length ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-muted-foreground text-sm font-medium">
              No pending shipments. All caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((s: Shipment) => {
              const files = selectedFiles[s.id] || [];
              const hasPod = s.files?.some((f: any) => f.file_type === "POD");
              const canMarkDelivered = hasPod && s.delivery_status !== "DELIVERED" && s.delivery_status !== "CANCELLED";
              const canMarkCancelled = s.delivery_status !== "DELIVERED" && s.delivery_status !== "CANCELLED";
              const uploading = uploadMutation.isPending && uploadMutation.variables?.id === s.id;
              const marking = markDeliveredMutation.isPending && markDeliveredMutation.variables?.id === s.id;
              const markingCancelled = markCancelledMutation.isPending && markCancelledMutation.variables?.id === s.id;

              return (
                <div key={s.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate">
                      {s.lr_no} · {s.consignee_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.destination} · Status:{" "}
                      <span
                        className={cn(
                          "font-bold",
                          s.delivery_status === "DELIVERED"
                            ? "text-emerald-600"
                            : s.delivery_status === "CANCELLED"
                            ? "text-red-500"
                            : "text-primary"
                        )}
                      >
                        {s.delivery_status}
                      </span>
                      {hasPod && (
                        <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-3 h-3" /> POD uploaded
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`pod-upload-row-${s.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-xs font-semibold text-foreground cursor-pointer hover:bg-muted/60 transition-all"
                      >
                        <FileUp className="w-4 h-4" />
                        Choose PODs
                      </label>
                      <input
                        id={`pod-upload-row-${s.id}`}
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilesChange(s.id, e.target.files)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground min-w-[120px]">
                      {files.length === 0
                        ? "No files"
                        : files.length === 1
                        ? files[0].name
                        : `${files.length} files selected`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!files.length || uploading}
                      onClick={() => files.length > 0 && uploadMutation.mutate({ id: s.id, files })}
                      className="px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                      Upload POD
                    </button>
                    <button
                      type="button"
                      disabled={!canMarkDelivered || marking}
                      onClick={() => markDeliveredMutation.mutate({ id: s.id })}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Mark Delivered
                    </button>
                    <button
                      type="button"
                      disabled={!canMarkCancelled || markingCancelled}
                      onClick={() => markCancelledMutation.mutate({ id: s.id })}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {markingCancelled ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Mark Cancelled
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

