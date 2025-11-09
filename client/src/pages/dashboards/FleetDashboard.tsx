import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  QrCode,
  Wrench,
  Users,
  Calendar,
  AlertTriangle,
  Sparkles,
  Building2,
  Package,
  TrendingUp,
  CheckCircle2,
  Clock
} from "lucide-react";

interface FleetDashboardData {
  industries: any[];
  totalAssets: number;
  assetsByIndustry: Record<string, any[]>;
  upcomingMaintenance: any[];
  operatorCount: number;
  activeAssets: number;
}

export default function FleetDashboard() {
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  
  const { data, isLoading } = useQuery<FleetDashboardData>({
    queryKey: ["/api/dashboard/fleet"],
    retry: false,
  });

  const industries = data?.industries || [];
  const totalAssets = data?.totalAssets || 0;
  const assetsByIndustry = data?.assetsByIndustry || {};
  const upcomingMaintenance = data?.upcomingMaintenance || [];
  const operatorCount = data?.operatorCount || 0;
  const activeAssets = data?.activeAssets || 0;

  // Initialize selected industry when data loads
  useEffect(() => {
    if (!selectedIndustry && industries.length > 0) {
      setSelectedIndustry(industries[0].id);
    }
  }, [industries, selectedIndustry]);

  const currentIndustryAssets = useMemo(
    () => selectedIndustry ? assetsByIndustry[selectedIndustry] || [] : [],
    [selectedIndustry, assetsByIndustry]
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="heading-fleet-dashboard">
                Fleet Management
              </h1>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                <Truck className="h-3 w-3 mr-1" />
                Fleet Manager
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Enterprise asset tracking & predictive maintenance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild data-testid="button-add-operator">
              <Link href="/tools/assets">
                <Users className="mr-2 h-4 w-4" />
                Operators
              </Link>
            </Button>
            <Button asChild size="lg" data-testid="button-scan-asset">
              <Link href="/scan">
                <QrCode className="mr-2 h-5 w-5" />
                Scan Asset
              </Link>
            </Button>
          </div>
        </div>

        {/* AI Badge */}
        <div className="mt-4">
          <Badge className="bg-gradient-to-r from-cyan-500/10 to-orange-500/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Predicts Maintenance Schedules for All Equipment — FREE
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Total Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-total-assets">
              {totalAssets}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeAssets} active assets
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-industries">
              {industries.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Asset categories tracked
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Maintenance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500" data-testid="stat-maintenance-due">
              {upcomingMaintenance.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Operators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-operators">
              {operatorCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Industry Tabs */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assets by Industry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {industries.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No industries configured</p>
              </div>
            ) : (
              <Tabs value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
                  {industries.map((industry: any) => (
                    <TabsTrigger 
                      key={industry.id} 
                      value={industry.id}
                      data-testid={`tab-industry-${industry.id}`}
                    >
                      {industry.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {industries.map((industry: any) => (
                  <TabsContent key={industry.id} value={industry.id}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{industry.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {currentIndustryAssets.length} assets in this category
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href="/scan">
                            <QrCode className="mr-2 h-4 w-4" />
                            Add Asset
                          </Link>
                        </Button>
                      </div>

                      {currentIndustryAssets.length === 0 ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No assets in this industry yet</p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentIndustryAssets.map((asset: any) => (
                            <div
                              key={asset.id}
                              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                              data-testid={`asset-card-${asset.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold">{asset.name || 'Unnamed Asset'}</h4>
                                <Badge
                                  variant={asset.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {asset.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {asset.manufacturer || 'Unknown make'} • {asset.model || 'Unknown model'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Schedule */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Upcoming Maintenance
                </CardTitle>
                <Button variant="outline" size="sm" asChild data-testid="button-view-all-maintenance">
                  <Link href="/tools/reminders">
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingMaintenance.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">All caught up! No maintenance due.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMaintenance.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`maintenance-${reminder.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{reminder.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {reminder.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(reminder.dueAt).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {reminder.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Active Rate</span>
                  <span className="text-sm font-semibold">
                    {totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button asChild className="w-full">
                  <Link href="/tools/reminders">
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Reminder
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-add-equipment">
          <Link href="/scan">
            <Truck className="h-6 w-6" />
            <span className="font-semibold">Add Equipment</span>
            <span className="text-xs text-muted-foreground">Scan QR code</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-manage-operators">
          <Link href="/tools/assets">
            <Users className="h-6 w-6" />
            <span className="font-semibold">Manage Operators</span>
            <span className="text-xs text-muted-foreground">Assign assets</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-utilization-report">
          <Link href="/tools/reports">
            <TrendingUp className="h-6 w-6" />
            <span className="font-semibold">Utilization Report</span>
            <span className="text-xs text-muted-foreground">Fleet analytics</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-schedule-maintenance">
          <Link href="/tools/reminders">
            <Wrench className="h-6 w-6" />
            <span className="font-semibold">Schedule Service</span>
            <span className="text-xs text-muted-foreground">Preventive maintenance</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
