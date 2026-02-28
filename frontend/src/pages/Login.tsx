import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Package, ShieldCheck, ArrowRight, Loader2, Mail, Lock, Zap, Shield, Activity, Globe, AlertCircle } from "lucide-react";
import { api, authService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid mission-critical email."),
    password: z.string().min(1, "Access key is required."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    useEffect(() => {
        const check = () => {
            api.get("/health")
                .then(() => setBackendReachable(true))
                .catch(() => {
                    if (import.meta.env.DEV) {
                        fetch("http://localhost:8000/api/v1/health", { method: "GET" })
                            .then((r) => (r.ok ? setBackendReachable(true) : setBackendReachable(false)))
                            .catch(() => setBackendReachable(false));
                    } else {
                        setBackendReachable(false);
                    }
                });
        };
        check();
    }, []);

    const onSubmit = async (data: LoginForm) => {
        try {
            const response = await authService.login(data);
            if (!response?.access_token) throw new Error("Authentication token missing.");
            localStorage.setItem("token", response.access_token);
            await refreshUser();
            const user = await authService.me();
            await new Promise(resolve => setTimeout(resolve, 800)); // Dramatic pause for "authentication"

            const role = (user.role ?? "").toString().toUpperCase();
            if (role === "ADMIN") navigate("/shipments", { replace: true });
            else if (role === "MANAGER") navigate("/manager", { replace: true });
            else if (role === "OWNER") navigate("/owner", { replace: true });
            else navigate("/portal", { replace: true });
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            const message =
                (typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg ?? detail[0] : null)
                ?? error.message
                ?? "Authentication failure. Please verify system access.";
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-page-enter">
                <div className="flex justify-center mb-8">
                    <div className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">SBDT Login</span>
                    </div>
                </div>

                <div className="text-center mb-10 space-y-4">
                    <div className="relative inline-block">
                        <div className="relative z-10 w-24 h-24 rounded-2xl bg-primary p-[2px] shadow-lg group">
                            <div className="w-full h-full bg-background rounded-[1.35rem] flex items-center justify-center border border-border">
                                <Package className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black text-foreground tracking-tighter italic">SBDT <span className="text-primary">Logistics</span></h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-[0.4em] text-[9px] flex items-center justify-center gap-2">
                            <Activity className="w-3 h-3 text-primary" />
                            Sign in to continue
                        </p>
                    </div>
                </div>

                {backendReachable === false && (
                    <div className="mb-6 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Backend not reachable</p>
                            <p className="text-xs text-muted-foreground mt-1">Start the backend from the <strong>backend</strong> folder: <code className="bg-muted px-1 rounded">.\run_backend.bat</code> (must run on port 8000). Keep that window open, then refresh this page.</p>
                        </div>
                    </div>
                )}

                <div className="glass-card rounded-2xl p-10 border-border relative overflow-hidden group shadow-lg">
                    {/* Interior tech corner details */}
                    <div className="absolute top-0 left-0 w-20 h-20 border-l border-t border-primary/20 rounded-tl-[3rem] opacity-50" />
                    <div className="absolute bottom-0 right-0 w-20 h-20 border-r border-b border-primary/20 rounded-br-[3rem] opacity-50" />

                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000 scale-150 rotate-12">
                        <ShieldCheck className="w-40 h-40 text-primary" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2 group/input">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Personnel Signature</label>
                                    <span className="text-[9px] font-bold text-primary/40 group-focus-within/input:text-primary transition-colors">REQ_AUTH_01</span>
                                </div>
                                <div className="relative group/field">
                                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            {...register("email")}
                                            type="email"
                                            className={cn(
                                                "w-full bg-muted/50 border-2 rounded-xl pl-14 pr-5 py-5 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground tracking-wider",
                                                errors.email ? "border-red-500/50" : "border-border focus:border-primary/50"
                                            )}
                                            placeholder="Email"
                                        />
                                    </div>
                                </div>
                                {errors.email && <p className="text-red-500 text-[10px] font-bold italic ml-1 flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.email.message}</p>}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2 group/input">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Coded Security Key</label>
                                    <span className="text-[9px] font-bold text-primary/40 group-focus-within/input:text-primary transition-colors">LVL_04_ENCRYPT</span>
                                </div>
                                <div className="relative group/field">
                                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            {...register("password")}
                                            type="password"
                                            className={cn(
                                                "w-full bg-muted/50 border-2 rounded-xl pl-14 pr-5 py-5 text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground tracking-widest",
                                                errors.password ? "border-red-500/50" : "border-border focus:border-primary/50"
                                            )}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                {errors.password && <p className="text-red-500 text-[10px] font-bold italic ml-1 flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.password.message}</p>}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="relative group/btn">
                            <button
                                type="submit"
                                disabled={isSubmitting || backendReachable !== true}
                                className="relative w-full bg-primary hover:opacity-90 py-5 rounded-xl text-primary-foreground font-black uppercase tracking-wider text-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:grayscale"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                ) : (
                                    <Shield className="w-4 h-4 text-primary group-hover:scale-125 transition-transform" />
                                )}
                                {isSubmitting ? "Signing in..." : backendReachable !== true ? "Start backend first…" : "Sign in"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Navigation */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8">
                    <Link to="/portfolio" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-all flex items-center gap-3 group">
                        <Globe className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                        Universal Root
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-800" />
                    <Link to="/signup" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3 group">
                        <Zap className="w-4 h-4 opacity-50 group-hover:opacity-100 text-yellow-500" />
                        Request Enlistment
                    </Link>
                </div>

                {/* System Version Pin */}
                <div className="mt-12 text-center space-y-2">
                    <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-[0.5em]">SBDT Logistics</span>
                    {import.meta.env.DEV && (
                        <p className="text-[10px] text-muted-foreground/80">
                            First time? Try <span className="font-mono text-primary">admin@sbdt.com</span> / <span className="font-mono">admin123</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
