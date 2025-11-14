import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, History, LogOut, QrCode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function WorkerAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: activeVisits } = useQuery<any[]>({
    queryKey: ['/api/worker/visits/active'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const activeVisit = activeVisits?.[0];

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/worker/check-in">
                <a className="text-lg font-bold">ServiceVault Worker</a>
              </Link>
              {activeVisit && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Visit in progress</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/worker/check-in">
                <Button 
                  variant={location === '/worker/check-in' ? 'default' : 'ghost'} 
                  size="sm"
                  data-testid="button-check-in"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              </Link>
              {activeVisit && (
                <Link href={`/worker/visit/${activeVisit.id}`}>
                  <Button 
                    variant={location.startsWith('/worker/visit') ? 'default' : 'ghost'}
                    size="sm"
                    data-testid="button-active-visit"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Active Visit
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
