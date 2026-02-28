import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Plane, User, Phone, MapPin, Package, Calendar, Mail, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import { cn } from "@/lib/utils";

type Mode = "surface" | "air";

export default function ManagerBooking() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("surface");
  const [form, setForm] = useState({
    customerName: "",
    mobile: "",
    noOfPackages: "",
    weight: "",
    originPincode: "",
    destinationPincode: "",
    preferredPickupDate: "",
    email: "",
    address1: "",
    address2: "",
    address3: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => shipmentService.create(data),
    onSuccess: () => navigate("/manager"),
    onError: (err: any) => alert(err.response?.data?.detail || err.message || "Failed to create booking"),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lrNo = `BOOK-${Date.now()}`;
    const address = [form.address1, form.address2, form.address3].filter(Boolean).join(", ");
    const remarks = [form.mobile && `Mobile: ${form.mobile}`, form.email && `Email: ${form.email}`].filter(Boolean).join("; ");
    const bookingDate = form.preferredPickupDate ? form.preferredPickupDate.slice(0, 10) : undefined;
    createMutation.mutate({
      lr_no: lrNo,
      consignor_name: form.customerName || undefined,
      consignor_address: address || undefined,
      boxes: form.noOfPackages ? parseInt(form.noOfPackages, 10) : undefined,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      source: form.originPincode || undefined,
      destination: form.destinationPincode || undefined,
      booking_date: bookingDate,
      shipment_type: mode === "air" ? "Air" : "Surface",
      remarks: remarks || undefined,
    });
  };

  return (
    <div className="max-w-5xl mx-auto animate-page-enter pb-20 relative">
      {/* Section-only background so it doesn’t cover layout hero */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl bg-gradient-to-b from-white via-slate-50/80 to-slate-100/90" />

      <div className="relative z-10">
        <div className="flex items-center gap-5 mb-10">
          <button
            onClick={() => navigate("/manager")}
            className="w-11 h-11 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center text-slate-600 hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              New <span className="text-primary">Booking</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">Create a new shipment booking</p>
          </div>
        </div>

        {/* Shipment type */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-border shadow-sm">
            <button
              type="button"
              onClick={() => setMode("surface")}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                mode === "surface"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              <Truck className="w-4 h-4" />
              Surface
            </button>
            <button
              type="button"
              onClick={() => setMode("air")}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                mode === "air"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              <Plane className="w-4 h-4" />
              Air
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Contact & Consignor" icon={User}>
              <div className="space-y-5">
                <InputGroup label="Consignor name" name="customerName" value={form.customerName} onChange={handleChange} icon={User} placeholder="Full name" required />
                <InputGroup label="Mobile" name="mobile" value={form.mobile} onChange={handleChange} icon={Phone} placeholder="Contact number" required />
                <InputGroup label="Email" name="email" type="email" value={form.email} onChange={handleChange} icon={Mail} placeholder="Email address" required />
              </div>
            </Section>

            <Section title="Shipment Details" icon={Package}>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="No. of packages" name="noOfPackages" value={form.noOfPackages} onChange={handleChange} icon={Package} placeholder="Quantity" required />
                  <InputGroup label="Weight (kg)" name="weight" value={form.weight} onChange={handleChange} icon={ShieldCheck} placeholder="Weight" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Origin pincode" name="originPincode" value={form.originPincode} onChange={handleChange} icon={MapPin} placeholder="Pincode" required />
                  <InputGroup label="Destination pincode" name="destinationPincode" value={form.destinationPincode} onChange={handleChange} icon={MapPin} placeholder="Pincode" required />
                </div>
                <InputGroup label="Preferred pickup date" name="preferredPickupDate" type="datetime-local" value={form.preferredPickupDate} onChange={handleChange} icon={Calendar} required />
              </div>
            </Section>

            <Section title="Pickup Address" icon={MapPin} className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InputGroup label="Address line 1" name="address1" value={form.address1} onChange={handleChange} placeholder="Building / Street" required />
                <InputGroup label="Address line 2" name="address2" value={form.address2} onChange={handleChange} placeholder="Area / Landmark" />
                <InputGroup label="Address line 3" name="address3" value={form.address3} onChange={handleChange} placeholder="City / State" />
              </div>
            </Section>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 border-t border-border">
            <button
              type="button"
              onClick={() => navigate("/manager")}
              className="text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-premium px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 w-full sm:w-auto order-1 sm:order-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {createMutation.isPending ? "Creating..." : "Create booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, className }: any) {
  return (
    <div className={cn("bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden", className)}>
      <Icon className="absolute top-0 right-0 w-32 h-32 text-slate-100 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputGroup({ label, icon: Icon, className, ...props }: any) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-bold text-slate-700">{label} {props.required && <span className="text-primary">*</span>}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          {...props}
          className={cn(
            "w-full bg-slate-50 border border-border rounded-xl py-3 text-slate-800 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400",
            Icon ? "pl-10 pr-4" : "px-4"
          )}
        />
      </div>
    </div>
  );
}
