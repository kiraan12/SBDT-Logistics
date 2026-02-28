
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  ScanLine,
  LogOut,
  Truck,
  Menu,
  ChevronLeft,
  Bell,
  User,
  LayoutDashboard,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import HeroSlider from "./HeroSlider";
import { PageTransition } from "./PageTransition";

export default function PortalLayout() {
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
    { icon: LayoutDashboard, label: "Dashboard", path: "/portal" },
    { icon: ScanLine, label: "Scan / Upload", path: "/portal/scan" },
    { icon: Truck, label: "My Shipments", path: "/portal/shipments" },
    { icon: CheckCircle, label: "POD Dashboard", path: "/portal/pods" },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col glass border-r border-white/5 transition-all duration-500 ease-in-out lg:relative",
          isCollapsed ? "w-20" : "w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Branding */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-border bg-card">
          <div className="group relative">
            <div className="absolute -inset-1 bg-primary/20 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-xl font-black tracking-tighter text-foreground">SBDT</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Customer Portal</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/portal" && item.path !== "/portal/scan" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                  isActive
                    ? "nav-item-active text-primary border-primary/20"
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
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          {!isCollapsed && (
            <div className="mb-4 p-3 rounded-2xl bg-muted border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold text-xs">
                  {(user?.full_name || "U").charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-foreground truncate">{user?.full_name || "Guest"}</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Portal User</span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 rounded-full glass border border-border items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-xl z-50"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-background relative">
        {/* Header */}
        <header className="h-20 glass border-b border-border px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl lg:text-2xl font-black text-foreground tracking-tighter uppercase italic">
                SBDT <span className="text-gradient">Portal.</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <Link to="/portal/profile" className="h-10 w-10 rounded-2xl bg-primary p-[1px] cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center border border-border">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-background">
          <div className="w-full max-w-[1600px] mx-auto p-6 lg:p-10 space-y-10 min-h-screen">
            <HeroSlider />

            <div className="min-h-[500px] relative z-10">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </div>

          <footer className="px-10 py-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
              &copy; 2024 SBDT Logistics India • Client Self-Service Portal
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
