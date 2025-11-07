import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Scan from "@/pages/scan";
import Pricing from "@/pages/pricing";
import IdentifiersPage from "@/pages/tools/identifiers";
import AssetsPage from "@/pages/tools/assets";
import DocumentsPage from "@/pages/tools/documents";
import ReportsPage from "@/pages/tools/reports";
import InspectionsPage from "@/pages/tools/inspections";
import RemindersPage from "@/pages/tools/reminders";
import AdminFulfillmentPage from "@/pages/tools/admin-fulfillment";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/scan" component={Scan} />
          <Route path="/pricing" component={Pricing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/scan" component={Scan} />
          <Route path="/pricing" component={Pricing} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
