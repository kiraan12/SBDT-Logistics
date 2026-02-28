
import { useQuery } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import type { Shipment, DeliveryStatus } from "@/types";
import { Link } from "react-router-dom";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    getPaginationRowModel
} from "@tanstack/react-table";
import { Printer, Search, Download, Pencil, Package, ChevronRight, ChevronLeft, Activity, Loader2 } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { SkeletonTableRow } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

const columnHelper = createColumnHelper<Shipment>();

export default function ShipmentsList() {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkPrinting, setBulkPrinting] = useState(false);
    const { user } = useAuth();
    const { pathname } = useLocation();
    const basePath = pathname.startsWith("/owner") ? "/owner/shipments" : "/shipments";
    const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN" || user?.role === "OWNER";
    const canDownloadPod = user?.role === "ADMIN" || user?.role === "MANAGER";
    const canBulkPrint = user?.role === "ADMIN" || user?.role === "OWNER";

    const { data: shipments, isLoading } = useQuery({
        queryKey: ["shipments", search],
        queryFn: () => shipmentService.getAll({ search }),
    });

    const handleDownloadPod = useCallback(async (shipmentId: string) => {
        try {
            const { blob, filename } = await shipmentService.downloadPod(shipmentId);
            if (!blob || blob.size === 0) throw new Error("Downloaded file is empty");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 500);
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.message || "Failed to download POD document";
            alert(`Error downloading POD:\n\n${errorMsg}`);
        }
    }, []);

    const handleBulkPrint = useCallback(async () => {
        if (selectedIds.size === 0) return;
        setBulkPrinting(true);
        try {
            const { blob, filename } = await shipmentService.downloadBulkPdf(Array.from(selectedIds), "all");
            if (!blob || blob.size === 0) throw new Error("Downloaded file is empty");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 500);
        } catch (error: any) {
            const msg = error.response?.data?.detail || error.message || "Bulk print failed";
            alert(msg);
        } finally {
            setBulkPrinting(false);
        }
    }, [selectedIds]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (!shipments?.length) return;
        if (selectedIds.size >= shipments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(shipments.map((s) => s.id)));
        }
    }, [shipments, selectedIds.size]);

    const columns = useMemo(
        () => [
            ...(canBulkPrint
                ? [
                    columnHelper.display({
                        id: "select",
                        header: () => (
                            <input
                                type="checkbox"
                                checked={shipments?.length ? selectedIds.size === shipments.length : false}
                                onChange={toggleSelectAll}
                                className="rounded border-border"
                            />
                        ),
                        cell: ({ row }) => (
                            <input
                                type="checkbox"
                                checked={selectedIds.has(row.original.id)}
                                onChange={() => toggleSelect(row.original.id)}
                                className="rounded border-border"
                            />
                        ),
                    }),
                ]
                : []),
            columnHelper.accessor("lr_no", {
                header: "LR No",
                cell: info => (
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                            <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div>
                            <p className="font-black text-foreground italic tracking-tighter">{info.getValue()}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{info.row.original.ship_date || "—"}</p>
                        </div>
                    </div>
                )
            }),
            columnHelper.accessor("consignor_name", {
                header: "Consignor",
                cell: info => (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground tracking-tight">{info.getValue()}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[180px]">{info.row.original.source || "—"}</span>
                    </div>
                )
            }),
            columnHelper.accessor("consignee_name", {
                header: "Consignee",
                cell: info => (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground tracking-tight">{info.getValue()}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[180px]">{info.row.original.destination || "—"}</span>
                    </div>
                )
            }),
            columnHelper.accessor("boxes", {
                header: "Boxes",
                cell: info => (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-bold text-foreground text-sm">{info.getValue()}</span>
                    </div>
                )
            }),
            columnHelper.accessor("booking_date", {
                header: "Booking Date",
                cell: info => (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{info.getValue() || "—"}</span>
                )
            }),
            columnHelper.accessor("delivery_status", {
                header: "Status",
                cell: info => <StatusBadge status={info.getValue() as DeliveryStatus} />,
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
                cell: info => {
                    const shipment = info.row.original;
                    const hasPod = shipment.files && shipment.files.some((f: any) => f.file_type === "POD");
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <Link
                                to={`${basePath}/${shipment.id}/edit`}
                                className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
                                title="Edit"
                            >
                                <Pencil className="w-4 h-4" />
                            </Link>
                            {canDownloadPod && (
                                <button
                                    onClick={() => handleDownloadPod(shipment.id)}
                                    disabled={!hasPod}
                                    className={cn(
                                        "w-9 h-9 flex items-center justify-center rounded-lg border transition-all",
                                        hasPod
                                            ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                                            : "bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60"
                                    )}
                                    title={hasPod ? "Download POD" : "No POD"}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            )}
                            <Link
                                to={`${basePath}/${shipment.id}/print`}
                                className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
                                title="Print / View"
                            >
                                <Printer className="w-4 h-4" />
                            </Link>
                        </div>
                    );
                },
            }),
        ],
        [basePath, canDownloadPod, canBulkPrint, handleDownloadPod, selectedIds, shipments?.length, toggleSelect, toggleSelectAll]
    );

    const table = useReactTable({
        data: shipments || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    const newScanPath = basePath + "/new/scan";

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-page-enter">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-foreground tracking-tighter italic">My <span className="text-gradient">Shipments.</span></h1>
                    <p className="text-muted-foreground font-medium font-inter uppercase tracking-[0.2em] text-[10px]">Freight deployment & tracking</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="search"
                            placeholder="Search by LR No, consignor, consignee..."
                            className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {canBulkPrint && selectedIds.size > 0 && (
                        <button
                            type="button"
                            onClick={handleBulkPrint}
                            disabled={bulkPrinting}
                            className="px-6 py-3 rounded-xl border border-primary bg-primary/10 text-primary font-bold text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-70"
                        >
                            {bulkPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {bulkPrinting ? "Preparing…" : `Bulk print (${selectedIds.size})`}
                        </button>
                    )}
                    {isManagerOrAdmin && (
                        <Link
                            to={newScanPath}
                            className="btn-premium px-8 py-4 text-primary-foreground rounded-xl shadow-md transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                        >
                            <Package className="w-4 h-4" />
                            New Scan
                            <ChevronRight className="w-3 h-3" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                {table.getHeaderGroups().map(headerGroup => (
                                    headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <SkeletonTableRow key={i} cols={columns.length} />
                                ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-10 py-6 text-sm whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-10 py-20">
                                        <EmptyState
                                            title="No shipments"
                                            description={search ? `No results for "${search}".` : "No shipments yet. Start with a new scan."}
                                            icon={Package}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && table.getRowModel().rows.length > 0 && (
                    <div className="px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-muted/20">
                        <div className="text-[10px] font-bold text-muted-foreground">
                            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, shipments?.length || 0)} of {shipments?.length || 0}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-foreground px-2">
                                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                            </span>
                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
