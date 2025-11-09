import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolModalProvider } from "@/contexts/ToolModalContext";
import { DevRoleOverrideProvider } from "@/hooks/useDevRoleOverride";
import { useAuth } from "@/hooks/useAuth";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/scan" component={Scan} />
          <Route path="/asset/:id" component={AssetView} />
          <Route path="/property/:id" component={PropertyView} />
          <Route path="/pricing" component={Pricing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/scan" component={Scan} />
          <Route path="/asset/:id" component={AssetView} />
          <Route path="/property/:id" component={PropertyView} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/branding" component={FamilyBrandingSettings} />
          <Route path="/tools/identifiers" component={IdentifiersPage} />
          <Route path="/tools/assets" component={AssetsPage} />
          <Route path="/tools/documents" component={DocumentsPage} />
          <Route path="/tools/reports" component={ReportsPage} />
          <Route path="/tools/inspections" component={InspectionsPage} />
          <Route path="/tools/reminders" component={RemindersPage} />
          <Route path="/tools/admin-fulfillment" component={AdminFulfillmentPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DevRoleOverrideProvider>
          <ToolModalProvider>
            <Toaster />
            <Router />
            <DevRoleSwitcher />
          </ToolModalProvider>
        </DevRoleOverrideProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
