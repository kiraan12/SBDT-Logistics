import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import PortalLayout from "@/components/PortalLayout";
import ManagerLayout from "@/components/ManagerLayout";
import OwnerLayout from "@/components/OwnerLayout";
import Login from "@/pages/Login";
import ShipmentsList from "@/pages/ShipmentsList";
import NewScan from "@/pages/NewScan";
import ManagerBooking from "@/pages/ManagerBooking";
import PrintShipment from "@/pages/PrintShipment";
import EditShipment from "@/pages/EditShipment";
import Tracking from "@/pages/Tracking";
import Analytics from "@/pages/Analytics";
import Exports from "@/pages/Exports";
import PortalDashboard from "@/pages/PortalDashboard";
import PortalPodDashboard from "@/pages/PortalPodDashboard";
import PortalShipments from "@/pages/PortalShipments";
import Portfolio from "@/pages/Portfolio";
import TermsAndConditions from "@/pages/TermsAndConditions";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Profile from "@/pages/Profile";
import ManageOperators from "@/pages/ManageOperators";
import ManageManagers from "@/pages/ManageManagers";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/portfolio" replace />;
  if (isLoading || !user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  const role = user?.role?.toUpperCase();
  if (role === "OWNER") return <Navigate to="/owner" replace />;
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "OPERATOR") return <Navigate to="/portal" replace />;
  return <Navigate to="/shipments" replace />;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem("token");
  
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  
  // If we have a token but user is not loaded yet, wait a bit
  if (!user && token) {
    return <div className="flex items-center justify-center min-h-screen">Loading user...</div>;
  }
  
  const role = user?.role?.toUpperCase();
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "OPERATOR") return <Navigate to="/portal" replace />;
  if (role === "OWNER") return <Navigate to="/owner" replace />;
  if (role !== "ADMIN") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem("token");
  
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  
  // If we have a token but user is not loaded yet, wait a bit
  if (!user && token) {
    return <div className="flex items-center justify-center min-h-screen">Loading user...</div>;
  }
  
  const role = user?.role?.toUpperCase();
  if (role === "ADMIN") return <Navigate to="/shipments" replace />;
  if (role === "OWNER") return <Navigate to="/owner" replace />;
  if (role === "OPERATOR") return <Navigate to="/portal" replace />;
  if (role !== "MANAGER") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem("token");

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;

  if (!user && token) {
    return <div className="flex items-center justify-center min-h-screen">Loading user...</div>;
  }

  const role = user?.role?.toUpperCase();
  if (role === "ADMIN") return <Navigate to="/shipments" replace />;
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "OPERATOR") return <Navigate to="/portal" replace />;
  if (role !== "OWNER") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem("token");
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  // Wait for user when we have a token (same as other guards)
  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading user...</div>;
  const role = user?.role?.toUpperCase();
  if (role === "ADMIN") return <Navigate to="/shipments" replace />;
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "OWNER") return <Navigate to="/owner" replace />;
  if (role !== "OPERATOR") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/login" element={<Login />} />
            
            {/* Root route - show portfolio when not logged in, else role-based dashboard */}
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Admin routes - /dashboard redirects to shipments so Overview works */}
            <Route path="/dashboard" element={<AdminGuard><Navigate to="/shipments" replace /></AdminGuard>} />
            <Route path="/shipments" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<ShipmentsList />} />
              <Route path="new/scan" element={<NewScan />} />
              <Route path="profile" element={<Profile />} />
              <Route path=":id/edit" element={<ErrorBoundary><EditShipment /></ErrorBoundary>} />
              <Route path=":id/print" element={<PrintShipment />} />
            </Route>
            <Route path="/tracking" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<Tracking />} />
            </Route>
            <Route path="/analytics" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<Analytics />} />
            </Route>
            <Route path="/exports" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<Exports />} />
            </Route>
            <Route path="/operators" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<ManageOperators />} />
            </Route>
            <Route path="/managers" element={<AdminGuard><Layout /></AdminGuard>}>
              <Route index element={<ManageManagers />} />
            </Route>

            {/* Manager routes */}
            <Route path="/manager" element={<ManagerGuard><ManagerLayout /></ManagerGuard>}>
              <Route index element={<ErrorBoundary><Tracking /></ErrorBoundary>} />
              <Route path="booking" element={<ErrorBoundary><ManagerBooking /></ErrorBoundary>} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Owner routes: Tracking, Shipments, New Scan, Analytics (with hero images) */}
            <Route path="/owner" element={<OwnerGuard><OwnerLayout /></OwnerGuard>}>
              <Route index element={<Navigate to="/owner/tracking" replace />} />
              <Route path="tracking" element={<Tracking />} />
              <Route path="shipments" element={<Outlet />}>
                <Route index element={<ShipmentsList />} />
                <Route path="new/scan" element={<NewScan />} />
                <Route path=":id/edit" element={<ErrorBoundary><EditShipment /></ErrorBoundary>} />
                <Route path=":id/print" element={<PrintShipment />} />
              </Route>
              <Route path="analytics" element={<Analytics />} />
              <Route path="managers" element={<ManageManagers />} />
              <Route path="operators" element={<ManageOperators />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            {/* Portal routes (Operator) */}
            <Route path="/portal" element={<PortalGuard><PortalLayout /></PortalGuard>}>
              <Route index element={<PortalDashboard />} />
              <Route path="scan" element={<NewScan />} />
              <Route path="pods" element={<PortalPodDashboard />} />
              <Route path="shipments" element={<Outlet />}>
                <Route index element={<PortalShipments />} />
                <Route path=":id/edit" element={<ErrorBoundary><EditShipment /></ErrorBoundary>} />
                <Route path=":id/print" element={<PrintShipment />} />
              </Route>
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
