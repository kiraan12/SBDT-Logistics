
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shipmentService } from "@/services/api";
import { Loader2, ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";
import ShipmentForm from "@/components/ShipmentForm";

export default function EditShipment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const basePath = pathname.startsWith("/owner")
    ? "/owner/shipments"
    : pathname.startsWith("/portal")
      ? "/portal/shipments"
      : "/shipments";

  const { data: shipment, isLoading, isError } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => shipmentService.getById(id!),
    enabled: !!id,
  });

  const goToList = () => navigate(basePath);

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
      <div className="flex items-center gap-6">
        <Link
          to={basePath}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
          title="Back to Command Center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">Modify <span className="text-gradient">Registry.</span></h1>
          <p className="text-slate-500 font-medium font-inter">
            {shipment?.lr_no ? (
              <span className="flex items-center gap-2">
                Editing <span className="text-white font-black">{shipment.lr_no}</span>
                <Sparkles className="w-3 h-3 text-primary" />
              </span>
            ) : "Synchronizing with secure database..."}
          </p>
        </div>
      </div>
      <Link
        to={basePath}
        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all text-center"
      >
        Exit Editor
      </Link>
    </div>
  );

  if (!id) {
    return (
      <div className="max-w-5xl mx-auto animate-page-enter">
        {header}
        <div className="glass-card border-amber-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-white font-black italic text-xl">Invalid Reference ID</h3>
          <p className="text-slate-500 max-w-sm">The provided asset signature is missing or corrupted. Redirecting to main node.</p>
          <button onClick={goToList} className="btn-premium px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest">Return Home</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-page-enter">
        {header}
        <div className="flex flex-col items-center justify-center p-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse-soft">Deciphering Asset Data...</span>
        </div>
      </div>
    );
  }

  if (isError || !shipment) {
    return (
      <div className="max-w-5xl mx-auto animate-page-enter">
        {header}
        <div className="glass-card border-red-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-black italic text-xl">Access Protocol Violation</h3>
          <p className="text-slate-500 max-w-sm">Unable to retrieve asset from secure sector. Check your clearance level or network connection.</p>
          <button onClick={goToList} className="btn-premium px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest">Registry Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-page-enter pb-20">
      {header}
      <ShipmentForm
        key={String(shipment.id)}
        initialData={shipment}
        shipmentId={String(id)}
        onSuccess={(updatedId) => {
          navigate(`${basePath}/${updatedId}/print`);
        }}
        onCancel={goToList}
        showCompanyAssign={false}
      />
    </div>
  );
}
