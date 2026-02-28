
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    Truck,
    AreaChart,
    LogOut,
    ScanLine,
    FileBarChart,
    Search,
    Menu,
    ChevronLeft,
    Bell,
    User,
    Users,
    Building2,
    Activity,
    Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import HeroSlider from "./HeroSlider";
import { PageTransition } from "./PageTransition";

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navItems = [
        { icon: Activity, label: "Overview", path: "/shipments" },
        { icon: Truck, label: "Shipments", path: "/shipments" },
        { icon: ScanLine, label: "New Scan", path: "/shipments/new/scan" },
        { icon: Search, label: "Tracking", path: "/tracking" },
        { icon: AreaChart, label: "Analytics", path: "/analytics" },
        { icon: FileBarChart, label: "Exports", path: "/exports" },
        { icon: Building2, label: "Managers", path: "/managers" },
        { icon: Users, label: "Operators", path: "/operators" },
        { icon: User, label: "Profile", path: "/shipments/profile" },
    ];

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    if (location.pathname === "/login") return <Outlet />;

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 z-30 relative group/sidebar",
                    isCollapsed ? "w-24" : "w-80"
                )}
            >
                <div className="p-8 border-b border-border flex items-center justify-between relative overflow-hidden">
                    <div className={cn("flex items-center gap-4 transition-all duration-500", isCollapsed && "opacity-0 invisible -translate-x-4")}>
                        <div className="relative group/logo">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md relative z-10 border border-border transform group-hover/logo:rotate-[10deg] transition-transform duration-300">
                                <Truck className="w-7 h-7 text-primary-foreground" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-[ -0.05em] text-foreground italic leading-none">SBDT</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60">Logistics</span>
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-3 hover:bg-muted rounded-2xl text-muted-foreground hover:text-primary transition-all duration-300 border border-transparent hover:border-border"
                    >
                        {isCollapsed ? <Layers className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>

                    {isCollapsed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                <Truck className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : ""}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-4 rounded-[1.25rem] transition-all duration-500 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm border border-primary/20 nav-item-active"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "relative z-10 w-6 h-6 flex items-center justify-center transition-all duration-500",
                                    isActive ? "text-primary scale-110" : "group-hover:text-primary"
                                )}>
                                    <item.icon className="w-full h-full" />
                                </div>
                                {!isCollapsed && (
                                    <span className="relative z-10 font-black text-[13px] uppercase tracking-[0.15em]">{item.label}</span>
                                )}

                                {isActive && (
                                    <>
                                        <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40 rounded-tr-xl" />
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/40 rounded-br-xl" />
                                    </>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-border space-y-3">
                    <div className={cn("p-4 rounded-2xl bg-muted/50 border border-border transition-all duration-300", isCollapsed && "opacity-0 invisible")}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Online</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-3/4 animate-pulse" />
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 px-5 py-4 w-full text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all duration-500 group relative border border-transparent hover:border-rose-500/20"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="font-black text-[13px] uppercase tracking-[0.15em]">Deauthorize</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Header/Nav */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-card backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                        <Truck className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="font-black text-2xl text-foreground tracking-tighter italic">SBDT</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-3 bg-muted rounded-xl text-muted-foreground border border-border"
                >
                    <Menu className="w-7 h-7" />
                </button>
            </div>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-[60] bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="p-10 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-16">
                            <span className="text-4xl font-black text-foreground italic tracking-tighter">Menu <span className="text-primary">SBDT</span></span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 flex items-center justify-center text-4xl text-muted-foreground hover:text-foreground transition-colors border border-border rounded-2xl bg-muted">&times;</button>
                        </div>
                        <nav className="space-y-4 flex-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className="flex items-center gap-6 text-2xl font-black text-muted-foreground hover:text-primary py-4 px-6 rounded-3xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all transition-colors uppercase tracking-widest italic"
                                >
                                    <item.icon className="w-8 h-8" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <button onClick={handleLogout} className="flex items-center gap-6 text-2xl font-black text-rose-500 italic py-6 px-6 border-t border-border mt-auto uppercase tracking-widest">
                            <LogOut className="w-8 h-8" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area - min-h-0 allows flex child to scroll; overflow-auto for scroll */}
            <main className="flex-1 min-h-0 overflow-auto flex flex-col relative pt-20 lg:pt-0 bg-background">
                <header className="hidden lg:flex h-24 items-center justify-between px-12 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.4em]">Active:</span>
                                <h2 className="text-xl font-black text-foreground tracking-widest uppercase italic leading-none truncate max-w-[200px]">
                                    {navItems.find(i => location.pathname.startsWith(i.path))?.label || "Overview"}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
                                </div>
                                <div className="w-[1px] h-3 bg-border" />
                                <span className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Synced</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <button className="p-3 bg-muted border border-border rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-primary/30 transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full ring-4 ring-background" />
                            </button>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Link to="/shipments/profile" className="flex items-center gap-4 pl-2 group cursor-pointer p-1.5 rounded-2xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-black text-foreground tracking-tight uppercase italic">{user?.full_name || "Admin User"}</span>
                                <span className="text-[9px] uppercase tracking-[0.4em] text-primary font-black flex items-center gap-1.5">
                                    <Activity className="w-2.5 h-2.5 animate-pulse" />
                                    {user?.role || "Administrator"}
                                </span>
                            </div>
                            <div className="relative w-12 h-12 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-all">
                                <User className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Sub Header / Info Bar */}
                <div className="px-8 lg:px-12 py-10 max-w-[1700px] w-full mx-auto space-y-12">
                    {/* Welcome Section */}
                    {location.pathname === "/shipments" && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-page-enter">
                            <div>
                                <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter italic leading-none">
                                    Welcome <span className="text-gradient font-black">{user?.full_name?.split(' ')[0] || "User"}</span>.
                                </h1>
                                <p className="text-muted-foreground mt-3 font-black uppercase tracking-[0.3em] text-xs">SBDT Logistics</p>
                            </div>
                            <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-xl border border-border self-start">
                                <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl bg-primary text-primary-foreground shadow-sm transition-all">Real-time</button>
                                <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-muted-foreground hover:text-foreground transition-all">Archives</button>
                                <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-muted-foreground hover:text-foreground transition-all">Strategy</button>
                            </div>
                        </div>
                    )}

                    {location.pathname === "/shipments" && <HeroSlider />}

                    {/* Content Outlet */}
                    <div className="relative min-h-[600px] w-full pb-32">
                        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[150px] pointer-events-none rounded-full" />
                        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/5 blur-[150px] pointer-events-none rounded-full" />
                        <PageTransition>
                            <Outlet />
                        </PageTransition>
                    </div>
                </div>

                {/* Footer Decor */}
                <footer className="mt-auto px-12 py-8 border-t border-border bg-card flex flex-col md:flex-row items-center justify-between gap-6 text-[9px] text-muted-foreground font-black tracking-[0.4em] uppercase italic">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span>© SBDT Logistics</span>
                    </div>
                    <div className="flex items-center gap-10">
                        <a href="mailto:sbdt.transport@gmail.com" className="hover:text-primary transition-all">Support</a>
                        <div className="px-4 py-1.5 rounded-full border border-border bg-muted/50">
                            SBDT Portal
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
