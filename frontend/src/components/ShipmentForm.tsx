
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { shipmentService, authService } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, X, Info, MapPin, Truck, Package, Calendar, User, FileText, IndianRupee, Zap, Activity, ShieldCheck, Globe, Clock, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

const PREDEFINED_VEHICLE_NUMBERS = [
  "KA51AB2768",
  "KA25C3954",
  "KA51C0959",
  "KA51AC0455",
  "KA51AA3421",
  "KA02AG6540",
  "KA52A7102",
  "KA01AJ4848",
  "KA01AL4347",
];
const OTHER_VEHICLE_VALUE = "__OTHER__";

const shipmentSchema = z.object({
    lr_no: z.string().min(1, "LR Number is required"),
    boxes: z.coerce.number().min(1, "Boxes required"),
    weight: z.coerce.number().min(0.1, "Weight required"),
    invoice_value: z.coerce.number().min(0, "Value required"),
    ship_date: z.string().optional(),
    shipment_type: z.string().optional(),
    branch_name: z.string().optional(),
    inv_no: z.string().optional(),
    booking_date: z.string().optional(),
    vehicle_no: z.string().optional(),
    expected_delivery_date: z.string().optional(),
    consignor_name: z.string().optional(),
    consignor_address: z.string().optional(),
    consignee_name: z.string().optional(),
    consignee_address: z.string().optional(),
    source: z.string().optional(),
    destination: z.string().optional(),
    remarks: z.string().optional(),
});

type ShipmentFormData = z.infer<typeof shipmentSchema>;

function toDateInputValue(s: string | undefined | null): string {
    if (s == null) return "";
    const str = typeof s === "string" ? s.trim() : String(s).trim();
    if (!str) return "";
    const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    return str;
}

function parseNumber(v: unknown): number {
    if (v == null) return 0;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
        const n = Number(v.replace(/,/g, "").trim());
        return Number.isNaN(n) ? 0 : n;
    }
    return 0;
}

export default function ShipmentForm({
    initialData,
    onSuccess,
    showCompanyAssign = false,
    shipmentId,
    onCancel,
    submitLabel,
}: {
    initialData: any;
    onSuccess: (id: string) => void;
    showCompanyAssign?: boolean;
    shipmentId?: string;
    onCancel?: () => void;
    /** Override submit button label (e.g. "Validate & commit to registry") */
    submitLabel?: string;
}) {
    const { user } = useAuth();
    const canAddNewVehicle = user?.role === "ADMIN" || user?.role === "OWNER" || user?.role === "OPERATOR";

    const isEdit = !!shipmentId;
    const data = initialData ?? {};
    const [ownerId, _setOwnerId] = useState<number | "">(data.owner_id ?? "");
    const initialVehicle = String(data.vehicle_no ?? "").trim().toUpperCase();
    const existingVehicleNotInList = initialVehicle && !PREDEFINED_VEHICLE_NUMBERS.some((v) => v.toUpperCase() === initialVehicle);
    const [vehicleSelect, setVehicleSelect] = useState<string>(() => {
        if (!initialVehicle) return "";
        const found = PREDEFINED_VEHICLE_NUMBERS.find((v) => v.toUpperCase() === initialVehicle);
        return found ?? (existingVehicleNotInList ? initialVehicle : OTHER_VEHICLE_VALUE);
    });
    const vehicleOptions = [
        ...PREDEFINED_VEHICLE_NUMBERS,
        ...(existingVehicleNotInList ? [initialVehicle] : []),
    ];
    const [otherVehicleOpen, setOtherVehicleOpen] = useState(false);
    const [otherVehicleInput, setOtherVehicleInput] = useState("");

    const defaultValues = {
        lr_no: String(data.lr_no ?? "").trim(),
        boxes: parseNumber(data.boxes) || 1,
        weight: parseNumber(data.weight) || 0,
        invoice_value: parseNumber(data.invoice_value) || 0,
        ship_date: toDateInputValue(data.ship_date) || "",
        shipment_type: (data.shipment_type === "Carton" ? "Carton Box" : data.shipment_type) || "Carton Box",
        branch_name: data.branch_name || "",
        inv_no: data.inv_no ?? "",
        booking_date: toDateInputValue(data.booking_date) || "",
        vehicle_no: data.vehicle_no ?? "",
        expected_delivery_date: toDateInputValue(data.expected_delivery_date) || "",
        consignor_name: String(data.consignor_name ?? "").trim(),
        consignor_address: String(data.consignor_address ?? "").trim(),
        consignee_name: String(data.consignee_name ?? "").trim(),
        consignee_address: String(data.consignee_address ?? "").trim(),
        source: String(data.source ?? "").trim(),
        destination: String(data.destination ?? "").trim(),
        remarks: data.remarks ?? "",
    };

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ShipmentFormData>({
        resolver: zodResolver(shipmentSchema) as any,
        defaultValues,
    });
    const vehicleNo = watch("vehicle_no");

    useEffect(() => {
        if (vehicleSelect && vehicleSelect !== OTHER_VEHICLE_VALUE) {
            setValue("vehicle_no", vehicleSelect);
        }
    }, [vehicleSelect, setValue]);

    const { data: _managers } = useQuery({
        queryKey: ["managers"],
        queryFn: () => authService.getManagers(),
        enabled: showCompanyAssign,
    });

    const queryClient = useQueryClient();
    const createMutation = useMutation({
        mutationFn: shipmentService.create,
        onSuccess: (data: any) => {
            const id = data?.id != null ? String(data.id) : "";
            if (!id) {
                alert("Shipment created but ID was not returned. Please check the shipments list.");
                return;
            }
            queryClient.invalidateQueries({ queryKey: ["shipments"] });
            onSuccess(id);
        },
        onError: (error: any) => alert("Error creating shipment: " + (error?.response?.data?.detail ?? error))
    });

    const updateMutation = useMutation({
        mutationFn: (payload: any) => shipmentService.update(shipmentId!, payload),
        onSuccess: () => onSuccess(shipmentId!),
        onError: (error: any) => alert("Error updating shipment: " + (error?.response?.data?.detail ?? error))
    });

    const onSubmit = (data: ShipmentFormData) => {
        const payload: any = { ...data };
        const dateFields = ["ship_date", "booking_date", "expected_delivery_date"];
        dateFields.forEach((f) => {
            if (payload[f] === "" || payload[f] == null) delete payload[f];
        });
        if (showCompanyAssign && ownerId !== "") payload.owner_id = Number(ownerId);
        if (isEdit) updateMutation.mutate(payload);
        else createMutation.mutate(payload);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit) as any} className="space-y-12 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Core LR / Shipment details */}
                <Section title="LR & Shipment Details" icon={FileText} className="lg:col-span-2 !bg-white border-border [&_h3]:!text-foreground [&_p]:!text-muted-foreground [&_.text-primary]:!text-primary">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                        <FormInput label="LR No / Tracking *" name="lr_no" register={register} error={errors.lr_no} icon={Zap} required />
                        <div className="lg:col-span-2">
                            <FormInput label="Invoice No" name="inv_no" register={register} icon={FileText} />
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Vehicle No</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <Truck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors z-10" />
                                <select
                                    value={vehicleSelect}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setVehicleSelect(v);
                                        if (v !== OTHER_VEHICLE_VALUE) {
                                            setValue("vehicle_no", v);
                                        } else {
                                            setValue("vehicle_no", "");
                                            setOtherVehicleInput(vehicleNo?.toString() || "");
                                            setOtherVehicleOpen(true);
                                        }
                                    }}
                                    className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-10 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">— Select vehicle —</option>
                                    {vehicleOptions.map((v) => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                    {canAddNewVehicle && (
                                        <option value={OTHER_VEHICLE_VALUE}>Other / New vehicle</option>
                                    )}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 z-10">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {canAddNewVehicle && vehicleSelect === OTHER_VEHICLE_VALUE && vehicleNo && (
                                <p className="text-xs text-slate-400 font-medium">
                                    Other vehicle: <span className="text-foreground font-bold uppercase">{vehicleNo}</span>
                                    <button type="button" onClick={() => { setOtherVehicleInput(vehicleNo); setOtherVehicleOpen(true); }} className="ml-2 text-primary hover:underline text-[10px] font-black uppercase">Change</button>
                                </p>
                            )}
                            {canAddNewVehicle && otherVehicleOpen && (
                                <div
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                                    onClick={() => {
                                        if (!vehicleNo) { setVehicleSelect(""); setValue("vehicle_no", ""); }
                                        setOtherVehicleOpen(false);
                                    }}
                                >
                                    <div className="bg-white border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Enter vehicle number</h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!vehicleNo) { setVehicleSelect(""); setValue("vehicle_no", ""); }
                                                    setOtherVehicleOpen(false);
                                                }}
                                                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                                            <input
                                                type="text"
                                                value={otherVehicleInput}
                                                onChange={(e) => setOtherVehicleInput(e.target.value.toUpperCase())}
                                                placeholder="e.g. KA01AB1234"
                                                className="w-full bg-white border border-border rounded-xl pl-12 pr-4 py-3 text-foreground font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none uppercase placeholder:text-slate-400"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        const v = otherVehicleInput.trim();
                                                        if (v) { setValue("vehicle_no", v); setOtherVehicleOpen(false); }
                                                    }
                                                    if (e.key === "Escape") {
                                                        if (!vehicleNo) { setVehicleSelect(""); setValue("vehicle_no", ""); }
                                                        setOtherVehicleOpen(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!vehicleNo) { setVehicleSelect(""); setValue("vehicle_no", ""); }
                                                    setOtherVehicleOpen(false);
                                                }}
                                                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-bold text-sm hover:bg-muted transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const v = otherVehicleInput.trim();
                                                    if (v) { setValue("vehicle_no", v); setOtherVehicleOpen(false); }
                                                }}
                                                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                                            >
                                                OK
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <FormInput label="Ship Date" name="ship_date" type="date" register={register} icon={Calendar} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-6">
                        <div className="flex flex-col gap-3">
                            <Label>No. of Boxes</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input {...register("boxes")} type="number" className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-5 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" />
                            </div>
                            {errors.boxes && <ErrorMsg>{errors.boxes.message}</ErrorMsg>}
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Weight (kg)</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input {...register("weight")} type="number" step="0.1" className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-5 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" />
                            </div>
                            {errors.weight && <ErrorMsg>{errors.weight.message}</ErrorMsg>}
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Invoice Value (₹)</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input {...register("invoice_value")} type="number" className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-5 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" />
                            </div>
                            {errors.invoice_value && <ErrorMsg>{errors.invoice_value.message}</ErrorMsg>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
                        <div className="flex flex-col gap-3">
                            <Label>Packing Type</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors z-10" />
                                <select {...register("shipment_type")} className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-10 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer">
                                    <option value="Carton Box" className="uppercase">Carton Box</option>
                                    <option value="Bin" className="uppercase">Bin</option>
                                    <option value="Pallet" className="uppercase">Pallet</option>
                                    <option value="Bag" className="uppercase">Bag</option>
                                    <option value="Drum" className="uppercase">Drum</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 z-10">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Booking Branch</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <Warehouse className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors z-10" />
                                <select {...register("branch_name")} className="relative w-full bg-white border border-border rounded-2xl pl-14 pr-10 py-4 text-foreground font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer">
                                    <option value="" className="uppercase">— Select Branch —</option>
                                    <option value="SKF Factory" className="uppercase">SKF Factory</option>
                                    <option value="SKF DC" className="uppercase">SKF DC</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 z-10">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Route */}
                <Section title="Route" icon={MapPin} className="!bg-white border-border [&_h3]:!text-foreground [&_p]:!text-muted-foreground">
                    <div className="space-y-8">
                        <FormInput label="Booking Date" name="booking_date" type="date" register={register} icon={Calendar} />
                        <FormInput label="Source" name="source" register={register} icon={Globe} />
                        <FormInput label="Destination" name="destination" register={register} icon={MapPin} />
                        <FormInput label="Expected Delivery Date" name="expected_delivery_date" type="date" register={register} icon={Clock} />
                    </div>
                </Section>

                {/* Consignor & Consignee */}
                <Section title="Consignor & Consignee" icon={User} className="!bg-white border-border [&_h3]:!text-foreground [&_p]:!text-muted-foreground">
                    <div className="space-y-10">
                        <div className="space-y-5">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-3">
                                <div className="w-4 h-px bg-primary/40" />
                                Consignor (Sender)
                            </h4>
                            <FormInput label="Name" name="consignor_name" register={register} icon={User} />
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <textarea {...register("consignor_address")} rows={3} placeholder="Address" className="relative w-full bg-white border border-border rounded-2xl px-6 py-4 text-foreground font-medium text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-5">
                            <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-[0.4em] flex items-center gap-3">
                                <div className="w-4 h-px bg-purple-400/40" />
                                Consignee (Receiver)
                            </h4>
                            <FormInput label="Name" name="consignee_name" register={register} icon={User} />
                            <div className="relative group">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <textarea {...register("consignee_address")} rows={3} placeholder="Address" className="relative w-full bg-white border border-border rounded-2xl px-6 py-4 text-foreground font-medium text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" />
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Remarks & Finalize */}
                <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white border border-border p-12 rounded-[4rem] relative overflow-hidden group shadow">
                        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-border rounded-tl-[4rem] pointer-events-none group-hover:border-primary/30 transition-colors" />
                        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-border rounded-br-[4rem] pointer-events-none group-hover:border-primary/30 transition-colors" />

                        <div className="absolute top-0 right-0 p-12 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-1000">
                            <FileText className="w-48 h-48 -rotate-12 text-muted-foreground" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <Label className="flex items-center gap-3 text-foreground">
                                <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <Info className="w-3.5 h-3.5" />
                                </div>
                                Remarks
                            </Label>
                            <textarea {...register("remarks")} className="w-full bg-white border border-border rounded-3xl px-6 py-5 text-foreground font-medium text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[120px] placeholder:text-slate-400" placeholder="Special instructions or notes..." />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-4">
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-12 py-5 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95">
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="w-full sm:w-auto btn-premium px-16 py-5 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 disabled:grayscale transition-all active:scale-95 group/btn"
                        >
                            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5 group-hover/btn:animate-pulse" />}
                            {submitLabel ?? (isEdit ? "Update Shipment" : "Create Shipment")}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

function Section({ title, icon: Icon, children, className }: any) {
    return (
        <div className={cn("glass-card p-12 rounded-[4rem] relative overflow-hidden group border-white/5 flex flex-col h-full bg-black/20", className)}>
            <div className="relative z-10 flex flex-col h-full">
                {/* Tactical Corners */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/20 rounded-tl-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/20 rounded-br-[4rem] pointer-events-none group-hover:border-primary/40 transition-colors" />

                <div className="flex items-center gap-5 border-b border-white/5 pb-8 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-2xl border border-primary/20 transition-all duration-700 group-hover:rotate-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                        <Icon className="w-6 h-6 relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{title}</h3>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            Section
                        </p>
                    </div>
                </div>
                <div className="flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
}

function FormInput({ label, name, register, type = "text", error, placeholder, icon: Icon, required }: any) {
    return (
        <div className="flex flex-col gap-3">
            <Label>{label} {required && <span className="text-primary italic animate-pulse">*</span>}</Label>
            <div className="relative group">
                {/* Focus Glow */}
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />

                {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors z-10" />}
                <input
                    {...register(name)}
                    type={type}
                    placeholder={placeholder}
                    className={cn(
                        "relative w-full bg-white border rounded-2xl py-4 text-foreground font-black text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400",
                        Icon ? "pl-14 pr-5" : "px-6",
                        error ? "border-red-500/50 bg-red-500/5" : "border-border group-hover:border-primary/40"
                    )}
                />
            </div>
            {error && <ErrorMsg>{error.message}</ErrorMsg>}
        </div>
    );
}

function Label({ children, className }: any) {
    return <label className={cn("text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] font-inter", className)}>{children}</label>;
}

function ErrorMsg({ children }: any) {
    return <span className="text-[10px] font-bold text-red-500 italic mt-1.5 flex items-center gap-2 px-1">
        <Info className="w-3.5 h-3.5" />
        {children}
    </span>;
}
