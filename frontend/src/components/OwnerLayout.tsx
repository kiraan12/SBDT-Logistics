
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Truck,
  Package,
  AreaChart,
  LogOut,
  ScanLine,
  Search,
  Menu,
  ChevronLeft,
  Bell,
  User,
  Users,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import HeroSlider from "./HeroSlider";
import { PageTransition } from "./PageTransition";

export default function OwnerLayout() {
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
    { icon: Search, label: "Tracking", path: "/owner/tracking" },
    { icon: Truck, label: "Shipments", path: "/owner/shipments" },
    { icon: ScanLine, label: "New Scan", path: "/owner/shipments/new/scan" },
    { icon: AreaChart, label: "Analytics", path: "/owner/analytics" },
    { icon: Building2, label: "Managers", path: "/owner/managers" },
    { icon: Users, label: "Operators", path: "/owner/operators" },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-slate-100 text-foreground overflow-hidden font-sans selection:bg-primary/30">
      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-border shadow-sm transition-all duration-500 ease-in-out lg:relative",
          isCollapsed ? "w-20" : "w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Branding */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-border bg-card">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-xl font-black tracking-tighter text-foreground">SBDT</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Logistics Owner</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                  isActive
                    ? "nav-item-active"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted hover:translate-x-1"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!isCollapsed && (
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          {!isCollapsed && (
            <div className="mb-4 p-3 rounded-2xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold text-xs">
                  {(user?.full_name || "O").charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-foreground truncate">{user?.full_name || "Owner"}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{user?.role}</span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all duration-300 group",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 rounded-full bg-white border border-border items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-xl z-50"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-100 relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-border px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-6">
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl lg:text-2xl font-black text-foreground tracking-tighter uppercase italic">
                SBDT <span className="text-gradient">Logistics.</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden sm:flex items-center gap-2 p-1.5 px-3 rounded-full bg-muted/80 border border-border">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Network Live</span>
            </div>

            <div className="h-8 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all relative group">
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary border-2 border-white" />
              </button>
              <Link to="/owner/profile" className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-[1px] cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center border border-border">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Scroller */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100">
          <div className="w-full max-w-[1600px] mx-auto p-6 lg:p-10 space-y-10 min-h-screen">

            <HeroSlider />

            {/* Value proposition */}
            <div className="bg-white border border-border p-6 md:p-8 rounded-[2rem] relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <Package className="w-48 h-48 rotate-12 text-muted-foreground" />
              </div>
              <div className="relative z-10 max-w-4xl">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  Premium Service Guarantee
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
                  Avail SBDT Logistics' value-added, customised logistics solutions that enable you to send your goods up to the farthest and remotest locations of India with fastest transit times and utmost safety. With its state-of-the-art infrastructure, direct routes and 24 x 7, 365 days operational continuity, SBDT Logistics ensures efficient, swift and reliable services to keep you ahead and India on time.
                </p>
              </div>
            </div>

            <div className="min-h-[500px] relative z-10">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </div>

          {/* Footer / Copyright */}
          <footer className="px-10 py-8 border-t border-border bg-white/50 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
              &copy; 2024 SBDT Logistics India • Proprietary & Confidential
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
