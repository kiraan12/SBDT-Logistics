
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import {
    Search,
    Loader2,
    Package,
    Truck,
    CheckCircle,
    Download,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowRight,
    Activity,
    Shield,
    Globe,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import type { DeliveryStatus } from "@/types";

const CLIENTS = [
    { name: "SKF", file: "SKF Logo.jpg" },
    { name: "Honda", file: "Honda.jpg" },
    { name: "TVS", file: "TVS.jpg" },
    { name: "Ashok Leyland", file: "Ashok Leyland.jpg" },
    { name: "Bosch", file: "Bosch.jpg" },
    { name: "Aqua Sub", file: "Aqua sub.png" },
    { name: "Klassic", file: "klassic.jpg" },
    { name: "Kay Jay", file: "Kay Jay.jpg" },
    { name: "Super Tech", file: "Super Tech.png" },
    { name: "Ather", file: "Ather.jpg" },
    { name: "Asia", file: "Asia.png" },
    { name: "OLA", file: "ola.jpg" },
    { name: "Royal Enfield", file: "Royal Enfield.jpg" },
    { name: "Mahindra", file: "Mahindra.jpg" },
    { name: "Sansera", file: "Sansera.jpg" },
    { name: "Streparava", file: "streparava.jpg" },
    { name: "VST", file: "VST.jpg" },
];

const SEARCH_DEBOUNCE_MS = 400;
const CLIENTS_PER_SLIDE = 4;

export default function Tracking() {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [clientSlide, setClientSlide] = useState(0);
    const { user } = useAuth();

    const clientSlideCount = Math.ceil(CLIENTS.length / CLIENTS_PER_SLIDE);

    const role = (user?.role ?? "").toString().toUpperCase();
    const isManager = role === "MANAGER";
    const isOwner = role === "OWNER";
    const searchOnlyView = isManager || isOwner;
    const canDownloadPod = role === "ADMIN" || role === "MANAGER";

    useEffect(() => {
        const id = setInterval(() => {
            setClientSlide((s) => (s >= clientSlideCount - 1 ? 0 : s + 1));
        }, 6000);
        return () => clearInterval(id);
    }, [clientSlideCount]);

    useEffect(() => {
        const trimmed = query.trim();
        const t = trimmed.length > 0
            ? window.setTimeout(() => setDebouncedQuery(trimmed), SEARCH_DEBOUNCE_MS)
            : (setDebouncedQuery(""), null);
        if (!trimmed) {
            setDebouncedQuery("");
        }
        return () => { if (t) window.clearTimeout(t); };
    }, [query]);

    const hasSearch = debouncedQuery.trim().length > 0;
    const { data: shipments, isLoading, isError, refetch } = useQuery({
        queryKey: ["tracking", user?.id, debouncedQuery],
        queryFn: () =>
            shipmentService.getAll({
                ...(hasSearch ? { search: debouncedQuery.trim() } : {}),
                limit: hasSearch ? 200 : 50,
            }),
        enabled: !!user?.id && (!searchOnlyView || hasSearch),
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
            alert(`Error downloading POD:\n\n${error.message}`);
        }
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setDebouncedQuery(query.trim());
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-page-enter relative pb-12">
            {/* Background only behind this section so it doesn’t cover the hero in manager layout */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50/95 via-background to-slate-100/90" />

            <div className="relative z-10">
                {/* Hero / Search Section */}
                <div className="text-center space-y-5 relative">
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-8 h-px bg-primary/40" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Track Shipment</span>
                            <div className="w-8 h-px bg-primary/40" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            Mission <span className="text-primary">Radar</span>
                        </h1>
                        <p className="text-muted-foreground text-xs max-w-md mx-auto">
                            Enter LR number or invoice to track your shipment.
                        </p>
                    </div>

                    <form onSubmit={handleSearch} className="relative group max-w-xl mx-auto pt-2">
                        <div className="relative flex rounded-2xl border border-border bg-card shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-muted-foreground">
                                <Activity className="w-4 h-4 text-primary/60" />
                            </div>
                            <input
                                type="text"
                                placeholder="LR number or Invoice..."
                                className="w-full bg-transparent px-12 py-4 text-foreground font-medium placeholder:text-muted-foreground focus:outline-none text-sm"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-primary text-primary-foreground font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        Search
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    {searchOnlyView && !hasSearch && (
                        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3 shadow-sm">
                            <Search className="w-10 h-10 text-primary/60 mx-auto" />
                            <p className="text-muted-foreground text-sm font-medium">
                                Enter LR number or invoice above to track a shipment.
                            </p>
                        </div>
                    )}
                    {isError && (
                        <div className="rounded-2xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 p-8 text-center space-y-4">
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center border border-red-200 dark:border-red-800/50 mx-auto">
                                <Shield className="w-7 h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-foreground font-semibold">Connection error</p>
                                <p className="text-muted-foreground text-sm">Failed to load tracking data. Please try again.</p>
                            </div>
                            <button onClick={() => refetch()} className="btn-premium px-5 py-2.5 rounded-xl text-xs font-semibold">Retry</button>
                        </div>
                    )}

                    {!isLoading && !isError && shipments && shipments.length > 0 && (
                        <div className="grid grid-cols-1 gap-6">
                            {shipments.map((s) => (
                                <ShipmentCard
                                    key={s.id}
                                    shipment={s}
                                    canDownloadPod={canDownloadPod}
                                    onDownloadPod={handleDownloadPod}
                                />
                            ))}
                        </div>
                    )}

                    {hasSearch && !isLoading && !isError && shipments && shipments.length === 0 && (
                        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4 shadow-sm">
                            <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center border border-border mx-auto">
                                <Search className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold text-foreground">No results</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                    No shipment found for <span className="font-medium text-foreground">"{debouncedQuery}"</span>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Partners */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-border" />
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partners</span>
                        </div>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${clientSlide * 100}%)` }}
                        >
                            {Array.from({ length: clientSlideCount }).map((_, slideIndex) => (
                                <div
                                    key={slideIndex}
                                    className="w-full flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3"
                                >
                                    {CLIENTS.slice(slideIndex * CLIENTS_PER_SLIDE, slideIndex * CLIENTS_PER_SLIDE + CLIENTS_PER_SLIDE).map((company) => (
                                        <div
                                            key={company.name}
                                            className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center min-h-[80px] shadow-sm"
                                        >
                                            <img
                                                src={`/images/${company.file}`}
                                                alt={company.name}
                                                className="w-20 h-10 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <span className="mt-2 text-[10px] font-medium text-muted-foreground truncate w-full text-center">{company.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center gap-1.5 mt-4">
                            {Array.from({ length: clientSlideCount }).map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setClientSlide(i)}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        i === clientSlide ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/30"
                                    )}
                                    aria-label={`Slide ${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Support</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">Contact us for operational support.</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <a href="mailto:sbdt.transport@gmail.com" className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground">
                                <Mail className="w-4 h-4 text-primary shrink-0" />
                                sbdt.transport@gmail.com
                            </a>
                            <a href="tel:9449181139" className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground">
                                <Phone className="w-4 h-4 text-primary shrink-0" />
                                9449181139
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShipmentCard({ shipment, canDownloadPod, onDownloadPod }: any) {
    const hasPod = shipment.files && shipment.files.some((f: any) => f.file_type === "POD");

    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden group">
            <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                {/* Shipment details */}
                <div className="flex-1 space-y-5 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="w-1.5 h-8 bg-primary rounded-full shrink-0" />
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">{shipment.lr_no}</h3>
                                <StatusBadge status={shipment.delivery_status as DeliveryStatus} />
                            </div>
                            <p className="text-muted-foreground text-xs font-medium ml-4">Registry: {shipment.inv_no}</p>
                        </div>

                        {canDownloadPod && (
                            <button
                                onClick={() => onDownloadPod(shipment.id)}
                                disabled={!hasPod}
                                className={cn(
                                    "h-10 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-[0.98]",
                                    hasPod
                                        ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
                                        : "bg-muted border-border text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                <Download className="w-4 h-4" />
                                Retrieve P.O.D
                            </button>
                        )}
                    </div>

                    {/* Origin → Target */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Origin</span>
                                </div>
                                <p className="text-foreground font-semibold text-sm truncate">{shipment.consignor_name}</p>
                                <p className="text-muted-foreground text-xs">{shipment.source}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center py-1">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <ArrowRight className="w-4 h-4 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-1 min-w-0 text-left md:text-right">
                                <div className="flex items-center gap-2 text-muted-foreground justify-end md:justify-start">
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Destination</span>
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <p className="text-foreground font-semibold text-sm truncate">{shipment.consignee_name}</p>
                                <p className="text-muted-foreground text-xs">{shipment.destination}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="lg:w-64 shrink-0 space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timeline</h4>
                    </div>

                    <div className="space-y-5 relative pl-3">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                        <TimelineStep
                            icon={Package}
                            label="Deployment Initialized"
                            date={shipment.booking_date}
                            completed={true}
                            status="Node Dispatch Exit"
                        />

                        <TimelineStep
                            icon={Truck}
                            label="Grid Synchronization"
                            date={`EST: ${shipment.expected_delivery_date}`}
                            completed={shipment.delivery_status !== 'BOOKED'}
                            status="Active Network Transit"
                            isPulse={shipment.delivery_status !== 'DELIVERED' && shipment.delivery_status !== 'BOOKED'}
                        />

                        <TimelineStep
                            icon={CheckCircle}
                            label="Target Acquisition"
                            date={shipment.actual_delivery_date || "Awaiting Confirmation"}
                            completed={shipment.delivery_status === 'DELIVERED'}
                            status="Mission Finalized"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimelineStep({ icon: Icon, label, date, completed, status, isPulse }: any) {
    return (
        <div className="flex gap-4 relative group/step">
            <div className={cn(
                "relative z-10 w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground"
            )}>
                {isPulse && completed && (
                    <div className="absolute inset-0 rounded-xl bg-primary animate-ping opacity-20" />
                )}
                <Icon className={cn("w-4 h-4", completed ? "animate-none" : "opacity-50")} />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className={cn("text-sm font-semibold leading-tight", completed ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                    <span className={cn("text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                        completed ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted")}>
                        {status}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 shrink-0 opacity-60" />
                    {date}
                </div>
            </div>
        </div>
    );
}
