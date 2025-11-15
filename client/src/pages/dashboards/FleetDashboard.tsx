import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandedHeader from "@/components/BrandedHeader";
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
  Clock,
  Search
} from "lucide-react";

interface FleetDashboardData {
  industries: any[];
  totalAssets: number;
  assetsByIndustry: Record<string, any[]>;
  maintenance: {
    overdue: any[];
    upcoming: any[];
    future: any[];
  };
  utilization: {
    deployed: number;
    idle: number;
    maintenance: number;
    percent: number;
  };
  operators: {
    total: number;
    unassignedAssets: any[];
    available: any[];
  };
  calendar: {
    items: any[];
    lastUpdated: string;
  };
}

export default function FleetDashboard() {
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data, isLoading } = useQuery<FleetDashboardData>({
    queryKey: ["/api/dashboard/fleet"],
    retry: false,
  });

  const industries = data?.industries || [];
  const totalAssets = data?.totalAssets || 0;
  const assetsByIndustry = data?.assetsByIndustry || {};
  const maintenance = data?.maintenance || { overdue: [], upcoming: [], future: [] };
  const utilization = data?.utilization || { deployed: 0, idle: 0, maintenance: 0, percent: 0 };
  const operators = data?.operators || { total: 0, unassignedAssets: [], available: [] };
  const calendar = data?.calendar || { items: [], lastUpdated: new Date().toISOString() };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'RED') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (urgency === 'YELLOW') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === 'RED') return <AlertTriangle className="h-4 w-4" />;
    if (urgency === 'YELLOW') return <Clock className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

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

  // Debounced search filtering (300ms) for assets, maintenance, and operators
  const filteredAssets = useMemo(() => {
    if (!debouncedSearch) return currentIndustryAssets;
    const query = debouncedSearch.toLowerCase();
    return currentIndustryAssets.filter((asset: any) => 
      asset.name?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query) ||
      asset.status?.toLowerCase().includes(query)
    );
  }, [currentIndustryAssets, debouncedSearch]);

  const filteredOverdue = useMemo(() => {
    if (!debouncedSearch) return maintenance.overdue;
    const query = debouncedSearch.toLowerCase();
    return maintenance.overdue.filter((item: any) => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.assetName?.toLowerCase().includes(query)
    );
  }, [maintenance.overdue, debouncedSearch]);

  const filteredUpcoming = useMemo(() => {
    if (!debouncedSearch) return maintenance.upcoming;
    const query = debouncedSearch.toLowerCase();
    return maintenance.upcoming.filter((item: any) => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.assetName?.toLowerCase().includes(query)
    );
  }, [maintenance.upcoming, debouncedSearch]);

  const totalResults = filteredAssets.length + filteredOverdue.length + filteredUpcoming.length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
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

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search equipment, operators, maintenance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-fleet"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {totalResults} results
            </Badge>
          )}
        </div>
      </div>

      {/* Compliance Alerts */}
      {(filteredOverdue.length > 0 || filteredUpcoming.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Overdue Maintenance Alert */}
          {filteredOverdue.length > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  <span>URGENT: Overdue Maintenance</span>
                  <Badge className="ml-auto bg-red-500 text-white" data-testid="badge-overdue-count">
                    {filteredOverdue.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Critical maintenance past due — immediate attention required
                </p>
                <div className="space-y-2">
                  {filteredOverdue.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-2 border-l-red-500" data-testid={`overdue-maintenance-${idx}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description || 'No description'}</p>
                        <p className="text-xs text-red-500 font-medium mt-1">
                          {item.daysLate} {item.daysLate === 1 ? 'day' : 'days'} overdue
                        </p>
                      </div>
                      <Badge className="bg-red-500 text-white">
                        OVERDUE
                      </Badge>
                    </div>
                  ))}
                </div>
                {filteredOverdue.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-red-500 hover:text-red-600" asChild>
                    <Link href="/tools/reminders">
                      View all {filteredOverdue.length} overdue items →
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Compliance Deadlines */}
          {filteredUpcoming.length > 0 && (
            <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                  <Clock className="h-5 w-5" />
                  <span>Upcoming Compliance Deadlines</span>
                  <Badge className="ml-auto bg-yellow-500 text-white" data-testid="badge-upcoming-count">
                    {filteredUpcoming.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Schedule these maintenance items soon to stay compliant
                </p>
                <div className="space-y-2">
                  {filteredUpcoming.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-2 border-l-yellow-500" data-testid={`upcoming-maintenance-${idx}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description || 'No description'}</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium mt-1">
                          Due {new Date(item.dueAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-500">
                        UPCOMING
                      </Badge>
                    </div>
                  ))}
                </div>
                {filteredUpcoming.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400" asChild>
                    <Link href="/tools/reminders">
                      View all {filteredUpcoming.length} upcoming items →
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Upcoming Maintenance Alert */}
      {filteredUpcoming.length > 0 && (
        <div className="mb-6">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                <Clock className="h-5 w-5" />
                <span>Upcoming Maintenance (Next 30 Days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredUpcoming.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`upcoming-maintenance-${idx}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due in {item.daysUntil} {item.daysUntil === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <Badge className={getUrgencyColor(item.urgency)}>
                      Soon
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              {utilization.deployed + utilization.idle} active assets
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
              {maintenance.overdue.length + maintenance.upcoming.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {maintenance.overdue.length > 0 && (
                <span className="text-red-500 font-medium">{maintenance.overdue.length} overdue, </span>
              )}
              {maintenance.upcoming.length} upcoming
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fleet Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-utilization">
              {utilization.percent}%
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-500">{utilization.deployed} deployed</span>
                <span className="text-yellow-500">{utilization.idle} idle</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-500">{utilization.maintenance} down</span>
                <span className="text-muted-foreground">{operators.total} operators</span>
              </div>
            </div>
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
                            {filteredAssets.length} assets in this category
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href="/scan">
                            <QrCode className="mr-2 h-4 w-4" />
                            Add Asset
                          </Link>
                        </Button>
                      </div>

                      {filteredAssets.length === 0 && !searchQuery ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No assets in this industry yet</p>
                        </div>
                      ) : filteredAssets.length === 0 && searchQuery ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No assets match "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAssets.map((asset: any) => {
                            // Calculate days since last service
                            const daysSinceService = asset.lastServicedAt 
                              ? Math.floor((Date.now() - new Date(asset.lastServicedAt).getTime()) / (1000 * 60 * 60 * 24))
                              : null;
                            
                            // Determine health status based on days since service
                            const getHealthStatus = () => {
                              if (!daysSinceService) return { label: 'Unknown', color: 'bg-gray-500' };
                              if (daysSinceService <= 30) return { label: 'Excellent', color: 'bg-green-500' };
                              if (daysSinceService <= 90) return { label: 'Good', color: 'bg-blue-500' };
                              if (daysSinceService <= 180) return { label: 'Fair', color: 'bg-yellow-500' };
                              return { label: 'Overdue', color: 'bg-red-500' };
                            };
                            
                            const healthStatus = getHealthStatus();
                            
                            return (
                              <div
                                key={asset.id}
                                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors relative"
                                data-testid={`asset-card-${asset.id}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold">{asset.name || 'Unnamed Asset'}</h4>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className={`w-2 h-2 rounded-full ${healthStatus.color}`}
                                      title={`Health: ${healthStatus.label}`}
                                      data-testid={`health-indicator-${asset.id}`}
                                    />
                                    <Badge
                                      variant={asset.status === 'ACTIVE' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {asset.status}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {asset.manufacturer || 'Unknown make'} • {asset.model || 'Unknown model'}
                                </p>
                                
                                {/* Usage Tracking Metrics */}
                                {(asset.operatingHours || asset.mileage || asset.runtime) && (
                                  <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-muted/30 rounded-md">
                                    {asset.operatingHours && (
                                      <div className="text-xs" data-testid={`operating-hours-${asset.id}`}>
                                        <span className="text-muted-foreground">Hours:</span>
                                        <span className="ml-1 font-medium">{asset.operatingHours}</span>
                                      </div>
                                    )}
                                    {asset.mileage && (
                                      <div className="text-xs" data-testid={`mileage-${asset.id}`}>
                                        <span className="text-muted-foreground">Miles:</span>
                                        <span className="ml-1 font-medium">{asset.mileage}</span>
                                      </div>
                                    )}
                                    {asset.runtime && (
                                      <div className="text-xs" data-testid={`runtime-${asset.id}`}>
                                        <span className="text-muted-foreground">Runtime:</span>
                                        <span className="ml-1 font-medium">{asset.runtime}h</span>
                                      </div>
                                    )}
                                    {asset.wearCycles && (
                                      <div className="text-xs" data-testid={`wear-cycles-${asset.id}`}>
                                        <span className="text-muted-foreground">Cycles:</span>
                                        <span className="ml-1 font-medium">{asset.wearCycles}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="space-y-1">
                                  {daysSinceService !== null && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Wrench className="h-3 w-3 text-muted-foreground" />
                                      <span className={daysSinceService > 180 ? 'text-red-500 font-medium' : 'text-muted-foreground'} data-testid={`days-since-service-${asset.id}`}>
                                        Last service: {daysSinceService} days ago
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
              {maintenance.upcoming.length === 0 && maintenance.future.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">All caught up! No maintenance due.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...maintenance.upcoming, ...maintenance.future].slice(0, 5).map((reminder: any) => (
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
                    {totalAssets > 0 ? Math.round(((utilization.deployed + utilization.idle) / totalAssets) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${totalAssets > 0 ? ((utilization.deployed + utilization.idle) / totalAssets) * 100 : 0}%` }}
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
