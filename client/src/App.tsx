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
import PublicAsset from "@/pages/public-asset";
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
import PropertyHistory from "@/pages/property-history";
import WorkerAppShell from "@/layouts/WorkerAppShell";
import CheckInLanding from "@/pages/worker/CheckInLanding";
import CheckInByCode from "@/pages/worker/CheckInByCode";
import ActiveVisit from "@/pages/worker/ActiveVisit";
import TenantReportForm from "@/pages/TenantReportForm";
import ContractorWelcome from "@/pages/contractor/ContractorWelcome";
import ContractorPlanSelection from "@/pages/contractor/ContractorPlanSelection";
import HomeownerWelcome from "@/pages/HomeownerWelcome";
import FleetWelcome from "@/pages/FleetWelcome";
import PropertyManagerWelcome from "@/pages/PropertyManagerWelcome";

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

  // Public routes without AppShell (landing, pricing, welcome pages, asset/property views, tenant reports)
  const publicRoutes = ["/", "/pricing"];
  const isPublicRoute = publicRoutes.includes(location) || 
                        location.startsWith("/asset/") || 
                        location.startsWith("/property/public/") ||
                        location.startsWith("/property/report/") ||
                        location.startsWith("/contractor/") ||
                        location.startsWith("/solutions/");

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/contractor/welcome" component={ContractorWelcome} />
        <Route path="/contractor/plans" component={ContractorPlanSelection} />
        <Route path="/solutions/contractors" component={ContractorWelcome} />
        <Route path="/solutions/homeowners" component={HomeownerWelcome} />
        <Route path="/solutions/fleet" component={FleetWelcome} />
        <Route path="/solutions/property-managers" component={PropertyManagerWelcome} />
        <Route path="/asset/:assetId" component={PublicAsset} />
        <Route path="/property/public/:masterQR" component={PropertyHistory} />
        <Route path="/property/report/:masterQR" component={TenantReportForm} />
      </Switch>
    );
  }

  // Worker routes (authenticated, use WorkerAppShell)
  if (isAuthenticated && location.startsWith("/worker")) {
    return (
      <WorkerAppShell>
        <Switch>
          <Route path="/worker/check-in" component={CheckInLanding} />
          <Route path="/worker/check-in/:masterQr" component={CheckInByCode} />
          <Route path="/worker/visit/:visitId" component={ActiveVisit} />
        </Switch>
      </WorkerAppShell>
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
          <Route path="/property/:id" component={PropertyView} />
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
      <Route path="/asset/:assetId" component={PublicAsset} />
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
