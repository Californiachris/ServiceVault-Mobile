import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import HomeownerDashboard from "@/pages/dashboards/HomeownerDashboard";
import ContractorDashboard from "@/pages/dashboards/ContractorDashboard";
import FleetDashboard from "@/pages/dashboards/FleetDashboard";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="spinner-loading" />
      </div>
    );
  }

  const userRole = user.role || "HOMEOWNER";

  // Route to role-specific dashboard
  switch (userRole) {
    case "CONTRACTOR":
      return <ContractorDashboard />;
    case "FLEET":
      return <FleetDashboard />;
    default: // HOMEOWNER
      return <HomeownerDashboard />;
  }
}
