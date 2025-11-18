import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandedHeader from "@/components/BrandedHeader";
import {
  Camera,
  Package,
  Bell,
  Users,
} from "lucide-react";

export default function ContractorDashboard() {
  const { user } = useAuth();
  
  const { data } = useQuery({
    queryKey: ["/api/contractors/me"],
    retry: false,
  });

  const contractor = data?.contractor;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Hero: Logo + Company Name */}
      <BrandedHeader 
        sector="contractor"
        companyName={contractor?.companyName || "Your Company"}
        subtitle="Professional asset tracking & job management"
      />

      {/* Main Action Cards */}
      <div className="space-y-4 mt-8">
        {/* Primary: Scan QR - TALL with Premium Styling */}
        <Link href="/scan">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-500/50 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer" data-testid="card-scan-qr">
            <CardContent className="p-12">
              <div className="flex items-center gap-6">
                <div className="p-6 bg-cyan-500/20 rounded-full shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                  <Camera className="h-12 w-12 text-cyan-500 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">Scan QR</h2>
                  <p className="text-base text-muted-foreground">
                    Install assets or clock in with one tap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Secondary: Assets Installed */}
        <Link href="/contractor/assets">
          <Card className="border-border hover:border-primary/50 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group" data-testid="card-assets-installed">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:shadow-lg transition-all">
                  <Package className="h-6 w-6 text-primary group-hover:drop-shadow-[0_0_6px_rgba(var(--primary),0.6)] transition-all" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Assets Installed</h3>
                  <p className="text-sm text-muted-foreground">
                    Search and export every asset you've ever tagged.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Secondary: Reminders */}
        <Link href="/contractor/reminders">
          <Card className="border-border hover:border-primary/50 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group" data-testid="card-reminders">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:shadow-lg transition-all">
                  <Bell className="h-6 w-6 text-primary group-hover:drop-shadow-[0_0_6px_rgba(var(--primary),0.6)] transition-all" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Reminders</h3>
                  <p className="text-sm text-muted-foreground">
                    Maintenance, warranty and follow-up jobs in one place.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Secondary: Team & Assignments */}
        <Link href="/contractor/team">
          <Card className="border-border hover:border-primary/50 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group" data-testid="card-team">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:shadow-lg transition-all">
                  <Users className="h-6 w-6 text-primary group-hover:drop-shadow-[0_0_6px_rgba(var(--primary),0.6)] transition-all" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Team & Assignments</h3>
                  <p className="text-sm text-muted-foreground">
                    Add workers, review hours and assign tomorrow's jobs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tip at bottom */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Tip: Manage account, logo, billing and sticker packs from the menu in the top-right.
      </p>
    </div>
  );
}
