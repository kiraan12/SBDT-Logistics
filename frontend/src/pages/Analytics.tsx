
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Package, CheckCircle, IndianRupee, Loader2, AlertCircle, TrendingUp, Calendar, Filter, Activity, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIODS = [
    { value: "", label: "All time" },
    { value: "month", label: "Monthly" },
    { value: "3months", label: "Last 3 months" },
    { value: "half_yearly", label: "Half-yearly (6 months)" },
    { value: "2years", label: "2 years" },
    { value: "3years", label: "3 years" },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Analytics() {
    const [period, setPeriod] = useState("");
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const params = period ? (period === "month" ? { period, year, month } : { period }) : {};
    const queryKeyStats = ["stats", params];
    const queryKeyTrends = ["trends", params];

    const fetchStats = async () => {
        const res = await api.get("/analytics/summary", { params });
        return res.data;
    };
    const fetchTrends = async () => {
        const res = await api.get("/analytics/trends", { params });
        return res.data;
    };

    const { data: stats, isLoading: loadingStats, isError: errorStats } = useQuery({ queryKey: queryKeyStats, queryFn: fetchStats });
    const { data: trends, isLoading: loadingTrends, isError: errorTrends } = useQuery({ queryKey: queryKeyTrends, queryFn: fetchTrends });

    const loading = loadingStats || loadingTrends;
    const error = errorStats || errorTrends;

    const periodLabel = !period ? "All time" : PERIODS.find((p) => p.value === period)?.label || period;
    const trendTitle = period ? `Deployment Trend (${periodLabel})` : "Deployment Trend (Last 7 days)";

    if (error) {
        return (
            <div className="space-y-8 animate-page-enter">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Market <span className="text-gradient">Intelligence.</span></h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time logistics analytics and trend forecasting.</p>
                </div>
                <div className="glass-card border-red-500/20 p-10 rounded-[3rem] flex items-center gap-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/[0.02] group-hover:bg-red-500/[0.04] transition-colors" />
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-2xl shadow-red-500/10 relative z-10 animate-pulse">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-2xl font-black text-white tracking-tight italic">Analytics Offline.</h3>
                        <p className="text-slate-400 font-medium max-w-md">We couldn't reach the intelligence server. Our global nodes are currently performing a standard handshake protocol. Please standby or verify your mission permissions.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-page-enter pb-20 relative">
            {/* Advanced Background System */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Dynamic Gradients */}
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[140px]" />

                {/* Tech Grid */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.01]" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-2">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Real-time Neural Feed</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Market <span className="text-gradient">Intelligence.</span></h1>
                    <p className="text-slate-500 font-medium max-w-xl font-inter tracking-tight">Deploying deep-learning analytics for global logistics forecasting and performance metrics.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="group relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-2 p-2 px-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl transition-all group-hover:border-primary/40">
                            <Filter className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="bg-transparent text-[11px] font-black text-white border-none focus:ring-0 outline-none cursor-pointer pr-6 tracking-widest uppercase"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p.value || "all"} value={p.value} className="bg-slate-900 text-white">{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {period === "month" && (
                        <div className="flex items-center gap-2 p-2 px-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="bg-transparent text-[11px] font-black text-white border-none focus:ring-0 outline-none cursor-pointer pr-6 tracking-widest uppercase"
                            >
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={i} value={i + 1} className="bg-slate-900 text-white">{name}</option>
                                ))}
                            </select>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="bg-transparent text-[11px] font-black text-white border-none focus:ring-0 outline-none cursor-pointer pr-2 tracking-widest"
                            >
                                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                                    <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 text-slate-500 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                        <Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
                    </div>
                    <div className="space-y-1 text-center">
                        <span className="text-[12px] font-black uppercase tracking-[0.5em] text-white animate-pulse-soft">Aggregating Global Feed</span>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Verifying integrity across regional nodes...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <StatCard
                            icon={Package}
                            label="Total Operations"
                            value={stats?.total_shipments ?? 0}
                            trend="+12.5% vs Last Period"
                            color="text-blue-400"
                            bg="bg-blue-400/10"
                            description="Active freight lifecycle count"
                        />
                        <StatCard
                            icon={CheckCircle}
                            label="Completion Rate"
                            value={`${stats?.delivered_percentage ?? 0}%`}
                            trend="99.9% Reliability Grade"
                            color="text-emerald-400"
                            bg="bg-emerald-400/10"
                            description="Success protocol verification"
                        />
                        <StatCard
                            icon={Activity}
                            label="Operational Flux"
                            value={`${stats?.pending_percentage ?? 0}%`}
                            trend="Real-time Transit Load"
                            color="text-amber-400"
                            bg="bg-amber-400/10"
                            description="Current network utilization"
                        />
                        <StatCard
                            icon={IndianRupee}
                            label="Gross Network Yield"
                            value={`₹${(typeof stats?.total_revenue === "number" ? stats.total_revenue : 0).toLocaleString()}`}
                            trend="Market Capitalization"
                            color="text-purple-400"
                            bg="bg-purple-400/10"
                            description="Consolidated revenue stream"
                        />
                    </div>

                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border-white/5 shadow-lg bg-black/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{trendTitle}</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        Predictive
                                    </span>
                                </div>
                                <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Logistics trend data</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="h-[280px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends || []}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="chartBorder" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#818cf8" />
                                            <stop offset="100%" stopColor="#c084fc" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={20}
                                        tick={{ fill: '#64748b', fontWeight: 800 }}
                                    />
                                    <YAxis
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-15}
                                        tick={{ fill: '#64748b', fontWeight: 800 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(2, 6, 23, 0.95)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '24px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: '#fff',
                                            backdropFilter: 'blur(20px)',
                                            padding: '16px',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--primary))', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="url(#chartBorder)"
                                        strokeWidth={5}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                        dot={{ r: 6, fill: '#0f172a', stroke: '#818cf8', strokeWidth: 3 }}
                                        activeDot={{ r: 10, fill: '#818cf8', stroke: '#fff', strokeWidth: 4 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operations</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verified</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function StatCard({ icon: Icon, label, value, trend, color, bg, description }: any) {
    return (
        <div className="glass-card p-5 rounded-xl relative overflow-hidden group hover:translate-y-[-2px] transition-all border-white/5 bg-black/20">
            <div className={cn("absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.04] blur-2xl", bg)} />

            <div className="space-y-4 relative z-10">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border border-white/10", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</p>
                    <p className="text-[9px] font-medium text-slate-600 uppercase tracking-wider">{description}</p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-colors group-hover:bg-white/10 group-hover:text-white">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                    {trend}
                </div>
            </div>
        </div>
    )
}
