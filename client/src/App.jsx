import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import ManageFeedSetup from "@/pages/ManageFeedSetup";
import NotFound from "@/pages/NotFound";
import Settings from "./pages/Settings";
import ProductHistory from "./pages/ProductHistory";
import Competitors from "./pages/Competitors";
import Products from "./pages/Products";
import Notifications from "./pages/Notifications";
import SmartReports from "./pages/SmartReports";
import MarketCompetitor from "./pages/MarketCompetitor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected — both roles use the same dashboard layout */}
            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/product-history" element={<ProductHistory />} />
              <Route path="/notifications" element={<Notifications />}/>
              <Route path="/manage-feed-setup" element={<ManageFeedSetup />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/competitors" element={<Competitors />} />
              <Route path="/products" element={<Products />} />
              <Route path="/market" element={<MarketCompetitor />} />
              <Route path="/smart-reports" element={<SmartReports />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
