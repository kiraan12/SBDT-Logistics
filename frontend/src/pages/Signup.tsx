
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Mail, Lock, User, Loader2, ArrowLeft, Zap, Shield, Activity, Globe } from "lucide-react";
import { authService } from "@/services/api";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
    email: z.string().email("Please provide a valid operative email."),
    password: z.string().min(6, "Personal passcode must be at least 6 characters."),
    full_name: z.string().min(1, "Legal full name is required for registry."),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupForm) => {
        try {
            await authService.signup(data);
            alert("Registry application successful. You may now authorize access.");
            navigate("/login", { replace: true });
        } catch (error: any) {
            alert(error.response?.data?.detail ?? "Registry protocol failed. Email might already be in active use.");
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Advanced Background System */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Dynamic Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px]" />

                {/* Tech Grid */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.02]" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-page-enter">
                {/* Status Indicator */}
                <div className="flex justify-center mb-8">
                    <div className="px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Registry Node: SBDT-REG-01</span>
                    </div>
                </div>

                {/* Hero Header Section */}
                <div className="text-center mb-10 space-y-4">
                    <div className="relative inline-block">
                        <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative z-10 w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 via-primary to-blue-600 p-[2px] shadow-2xl shadow-emerald-500/30 group rotate-3 hover:rotate-0 transition-all duration-700">
                            <div className="w-full h-full bg-[#050a16] rounded-[2.5rem] flex items-center justify-center relative overflow-hidden">
                                <UserPlus className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black text-white tracking-tighter italic">Network <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">Enlistment</span></h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[9px] flex items-center justify-center gap-2">
                            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                            Initialize Personnel Identity
                        </p>
                    </div>
                </div>

                {/* Registry Console */}
                <div className="glass-card rounded-[3rem] p-10 border-white/[0.05] relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    {/* Tactical Corners */}
                    <div className="absolute top-0 left-0 w-20 h-20 border-l border-t border-emerald-500/20 rounded-tl-[3rem] opacity-50" />
                    <div className="absolute bottom-0 right-0 w-20 h-20 border-r border-b border-emerald-500/20 rounded-br-[3rem] opacity-50" />

                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000 scale-150 rotate-12">
                        <ShieldCheck className="w-40 h-40 text-emerald-500" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            {/* Name Input */}
                            <div className="space-y-2 group/input">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Legal Full Name</label>
                                    <span className="text-[9px] font-bold text-emerald-500/40 group-focus-within/input:text-emerald-500 transition-colors">ID_ENTITY_01</span>
                                </div>
                                <div className="relative group/field">
                                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/field:text-emerald-500 transition-colors" />
                                        <input
                                            {...register("full_name")}
                                            type="text"
                                            className={cn(
                                                "w-full bg-[#050a16]/80 backdrop-blur-xl border-2 rounded-2xl pl-14 pr-5 py-5 text-white font-black italic focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-800 tracking-wider",
                                                errors.full_name ? "border-red-500/30" : "border-white/[0.05] focus:border-emerald-500/50"
                                            )}
                                            placeholder="OPERATIVE_NAME"
                                        />
                                    </div>
                                </div>
                                {errors.full_name && <p className="text-red-500 text-[10px] font-bold italic ml-1 flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.full_name.message}</p>}
                            </div>

                            {/* Email Input */}
                            <div className="space-y-2 group/input">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Personnel Email</label>
                                    <span className="text-[9px] font-bold text-emerald-500/40 group-focus-within/input:text-emerald-500 transition-colors">COMM_LINK_02</span>
                                </div>
                                <div className="relative group/field">
                                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/field:text-emerald-500 transition-colors" />
                                        <input
                                            {...register("email")}
                                            type="email"
                                            className={cn(
                                                "w-full bg-[#050a16]/80 backdrop-blur-xl border-2 rounded-2xl pl-14 pr-5 py-5 text-white font-black italic focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-800 tracking-wider",
                                                errors.email ? "border-red-500/30" : "border-white/[0.05] focus:border-emerald-500/50"
                                            )}
                                            placeholder="OPERATIVE_EMAIL"
                                        />
                                    </div>
                                </div>
                                {errors.email && <p className="text-red-500 text-[10px] font-bold italic ml-1 flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.email.message}</p>}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2 group/input">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secure Passkey</label>
                                    <span className="text-[9px] font-bold text-emerald-500/40 group-focus-within/input:text-emerald-500 transition-colors">CRYPT_KEY_03</span>
                                </div>
                                <div className="relative group/field">
                                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/field:text-emerald-500 transition-colors" />
                                        <input
                                            {...register("password")}
                                            type="password"
                                            className={cn(
                                                "w-full bg-[#050a16]/80 backdrop-blur-xl border-2 rounded-2xl pl-14 pr-5 py-5 text-white font-black italic focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-800 tracking-widest",
                                                errors.password ? "border-red-500/30" : "border-white/[0.05] focus:border-emerald-500/50"
                                            )}
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>
                                {errors.password && <p className="text-red-500 text-[10px] font-bold italic ml-1 flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.password.message}</p>}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="relative group/btn">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-primary to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="relative w-full bg-[#0a0f1d] hover:bg-[#0d1428] py-5 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:grayscale border border-white/10"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                ) : (
                                    <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
                                )}
                                {isSubmitting ? "ENCRYPTING DATA..." : "INITIALIZE REGISTRY"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Navigation */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8">
                    <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all flex items-center gap-3 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
                        Back to Auth Node
                    </Link>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-800" />
                    <Link to="/portfolio" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-colors flex items-center gap-3 group">
                        <Globe className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                        Universal Root
                    </Link>
                </div>

                {/* System Version Pin */}
                <div className="mt-12 text-center">
                    <span className="text-[8px] font-medium text-slate-700 uppercase tracking-[0.5em]">Network Protocol V2.0 // Enlistment Core</span>
                </div>
            </div>
        </div>
    );
}
