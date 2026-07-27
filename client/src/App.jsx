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
import ForgotPassword from "@/pages/ForgotPassword";
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
import ProductMapping from "./pages/ProductMapping";
import FullsiteRemapping from "./pages/FullsiteRemapping";
import ProductMappingLayout from "./pages/ProductMappingLayout";
import PendingSignups from "./pages/PendingSignups";
import Home from "./pages/Home";
import { ROUTES } from "./utilis/urls";
import {ROUTE  , ADMIN_BASE} from "./utils/urls";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes >
            {/* Public */}
            <Route path={ROUTE.home} element={<Home />} />
            <Route path={ROUTE.login} element={<Login />} />
            <Route path={ROUTE.signup} element={<Signup />} />
            <Route path={ROUTE.forgotPassword} element={<ForgotPassword />} />

            {/* Protected — both roles use the same dashboard layout */}
            <Route basename={ADMIN_BASE} element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path={ROUTE.dashboard} element={<Dashboard />} />
              <Route path={ROUTE.productHistory} element={<ProductHistory />} />
              <Route path={ROUTES.productHistory} element={<ProductHistory />} />
              <Route path={ROUTE.notifications} element={<Notifications />}/>
              <Route path={ROUTE.manageFeedSetup} element={<ManageFeedSetup />} />
              <Route path={ROUTE.settings} element={<Settings />} />
              <Route path={ROUTE.competitors} element={<Competitors />} />
              <Route path={ROUTE.products} element={<Products />} />
              <Route path={ROUTE.market} element={<MarketCompetitor />} />
              <Route element={<ProductMappingLayout />}>
                  <Route path={ROUTE.productMapping} element={<ProductMapping />} />
                  <Route path={ROUTE.fullsiteRemapping} element={<FullsiteRemapping />} />
              </Route>
              <Route path={ROUTE.smartReports} element={<SmartReports />} />
              <Route path={ROUTE.pendingSignups} element={<PendingSignups />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
