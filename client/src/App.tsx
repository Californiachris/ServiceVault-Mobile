import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolModalProvider } from "@/contexts/ToolModalContext";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Scan from "@/pages/scan";
import AssetView from "@/pages/asset-view";
import PropertyView from "@/pages/property-view";
import Pricing from "@/pages/pricing";
import Settings from "@/pages/settings";
import FamilyBrandingSettings from "@/pages/family-branding-settings";
import IdentifiersPage from "@/pages/tools/identifiers";
import AssetsPage from "@/pages/tools/assets";
import DocumentsPage from "@/pages/tools/documents";
import ReportsPage from "@/pages/tools/reports";
import InspectionsPage from "@/pages/tools/inspections";
import RemindersPage from "@/pages/tools/reminders";
import AdminFulfillmentPage from "@/pages/tools/admin-fulfillment";
import PropertyManagerDashboard from "@/pages/dashboards/PropertyManagerDashboard";
import PropertyManagerProperties from "@/pages/property-manager/properties";
import PropertyManagerWorkers from "@/pages/property-manager/workers";
import PropertyManagerTasks from "@/pages/property-manager/tasks";
import PropertyManagerVisits from "@/pages/property-manager/visits";
import PropertyManagerTenantReports from "@/pages/property-manager/tenant-reports";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Public routes without AppShell (landing, pricing, asset/property views)
  const publicRoutes = ["/", "/pricing"];
  const isPublicRoute = publicRoutes.includes(location) || 
                        location.startsWith("/asset/") || 
                        location.startsWith("/property/");

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/asset/:id" component={AssetView} />
        <Route path="/property/:id" component={PropertyView} />
      </Switch>
    );
  }

  // AUTHENTICATED routes: Wrap in AppShell with top bar + bottom nav
  if (isAuthenticated) {
    return (
      <AppShell>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/scan" component={Scan} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/branding" component={FamilyBrandingSettings} />
          <Route path="/tools/identifiers" component={IdentifiersPage} />
          <Route path="/tools/assets" component={AssetsPage} />
          <Route path="/tools/documents" component={DocumentsPage} />
          <Route path="/tools/reports" component={ReportsPage} />
          <Route path="/tools/inspections" component={InspectionsPage} />
          <Route path="/tools/reminders" component={RemindersPage} />
          <Route path="/tools/admin-fulfillment" component={AdminFulfillmentPage} />
          <Route path="/property-manager" component={PropertyManagerDashboard} />
          <Route path="/property-manager/properties" component={PropertyManagerProperties} />
          <Route path="/property-manager/workers" component={PropertyManagerWorkers} />
          <Route path="/property-manager/tasks" component={PropertyManagerTasks} />
          <Route path="/property-manager/visits" component={PropertyManagerVisits} />
          <Route path="/property-manager/reports" component={PropertyManagerTenantReports} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    );
  }

  // UNAUTHENTICATED fallback
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/scan" component={Scan} />
      <Route path="/asset/:id" component={AssetView} />
      <Route path="/property/:id" component={PropertyView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToolModalProvider>
          <Toaster />
          <Router />
        </ToolModalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
