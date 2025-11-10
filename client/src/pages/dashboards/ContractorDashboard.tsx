import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  QrCode,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react";

interface ContractorDashboardData {
  contractor: any;
  jobs: {
    pending: number;
    scheduled: number;
    completed: number;
    recent: any[];
  };
  revenue: number;
  revenueStats: {
    current: number;
    previous: number;
    delta: number;
    deltaPct: number;
    trend: 'UP' | 'DOWN' | 'FLAT';
  };
  serviceAlerts: any[];
  quota: {
    total: number;
    used: number;
    remaining: number;
    isQuotaLow: boolean;
  };
  clientCount: number;
  subscription: any;
}

export default function ContractorDashboard() {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery<ContractorDashboardData>({
    queryKey: ["/api/dashboard/contractor"],
    retry: false,
  });

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

  const contractor = data?.contractor;
  const jobs = data?.jobs || { pending: 0, scheduled: 0, completed: 0, recent: [] };
  const revenue = data?.revenue || 0;
  const revenueStats = data?.revenueStats || { current: 0, previous: 0, delta: 0, deltaPct: 0, trend: 'FLAT' };
  const serviceAlerts = data?.serviceAlerts || [];
  const quota = data?.quota || { total: 50, used: 0, remaining: 50, isQuotaLow: false };
  const clientCount = data?.clientCount || 0;
  const subscription = data?.subscription;

  const quotaPercentage = quota.total > 0 ? (quota.used / quota.total) * 100 : 0;
  const quotaColor = quota.isQuotaLow ? "text-red-500" : quotaPercentage > 70 ? "text-orange-500" : "text-green-500";
  
  const getTrendIcon = (trend: string) => {
    if (trend === 'UP') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'DOWN') return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'RED') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (urgency === 'YELLOW') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="heading-contractor-dashboard">
                Job Management
              </h1>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                <Building2 className="h-3 w-3 mr-1" />
                Contractor
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {contractor?.companyName || "Your contracting business"} — Professional asset tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild data-testid="button-order-stickers">
              <Link href="/pricing">
                <Package className="mr-2 h-4 w-4" />
                Order Stickers
              </Link>
            </Button>
            <Button asChild size="lg" data-testid="button-new-install">
              <Link href="/scan">
                <QrCode className="mr-2 h-5 w-5" />
                New Install
              </Link>
            </Button>
          </div>
        </div>

        {/* AI Badge */}
        <div className="mt-4">
          <Badge className="bg-gradient-to-r from-cyan-500/10 to-orange-500/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Identifies Service Opportunities in Client Assets — FREE
          </Badge>
        </div>
      </div>

      {/* Service Opportunity Alerts */}
      {serviceAlerts.length > 0 && (
        <div className="mb-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <span>Service Opportunities — Potential Revenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Client warranties expiring soon — reach out to offer service contracts
              </p>
              <div className="space-y-2">
                {serviceAlerts.slice(0, 3).map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`service-alert-${idx}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.assetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.documentName} expires in {alert.daysUntilExpiry} days
                      </p>
                    </div>
                    <Badge className={getUrgencyColor(alert.urgency)}>
                      {alert.urgency === 'RED' ? 'Urgent' : 'Soon'}
                    </Badge>
                  </div>
                ))}
              </div>
              {serviceAlerts.length > 3 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  +{serviceAlerts.length - 3} more opportunities
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quota Low Warning */}
      {quota.isQuotaLow && (
        <div className="mb-6">
          <Card className="border-l-4 border-l-red-500 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-500">Low QR Code Quota</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have only {quota.remaining} stickers remaining. Order more to avoid service disruptions.
                  </p>
                </div>
                <Button variant="destructive" size="sm" asChild data-testid="button-order-now">
                  <Link href="/pricing">
                    Order Now
                  </Link>
                </Button>
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
              <Package className="h-4 w-4" />
              QR Quota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${quotaColor}`} data-testid="stat-quota">
              {quota.remaining}/{quota.total}
            </div>
            <Progress value={quotaPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {quota.used} used this month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-active-jobs">
              {jobs.pending + jobs.scheduled}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {jobs.pending} pending, {jobs.scheduled} scheduled
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-revenue">
              ${revenueStats.current.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(revenueStats.trend)}
              <p className={`text-xs font-medium ${
                revenueStats.trend === 'UP' ? 'text-green-500' : 
                revenueStats.trend === 'DOWN' ? 'text-red-500' : 
                'text-muted-foreground'
              }`} data-testid="stat-revenue-trend">
                {revenueStats.trend === 'FLAT' ? 'No change' : `${Math.abs(revenueStats.deltaPct).toFixed(1)}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                vs previous 30 days
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-clients">
              {clientCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active customer properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Jobs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Jobs
                </CardTitle>
                <Button variant="outline" size="sm" asChild data-testid="button-view-all-jobs">
                  <Link href="/tools/assets">
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {jobs.recent.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No jobs yet</p>
                  <Button asChild data-testid="button-start-first-install">
                    <Link href="/scan">
                      <QrCode className="mr-2 h-4 w-4" />
                      Start First Installation
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.recent.slice(0, 5).map((job: any) => (
                    <div
                      key={job.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`job-card-${job.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {job.title || 'Untitled Job'}
                            </h3>
                            <Badge
                              variant={
                                job.status === 'COMPLETED' ? 'default' :
                                job.status === 'SCHEDULED' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {job.customerName || 'Unknown client'} — {job.propertyName || 'No property'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(job.scheduledDate || job.createdAt).toLocaleDateString()}
                            </span>
                            {job.value && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${job.value.toLocaleString()}
                              </span>
                            )}
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

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Job Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-lg font-bold" data-testid="stat-pending-jobs">
                  {jobs.pending}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <span className="text-lg font-bold" data-testid="stat-scheduled-jobs">
                  {jobs.scheduled}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-lg font-bold" data-testid="stat-completed-jobs">
                  {jobs.completed}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quota Warning */}
          {quota.remaining < 10 && (
            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-orange-500">
                  <Zap className="h-4 w-4" />
                  Low Quota
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Only {quota.remaining} QR codes remaining
                </p>
                <Button asChild className="w-full">
                  <Link href="/pricing">
                    Upgrade Plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-create-reminder">
          <Link href="/tools/reminders">
            <Calendar className="h-6 w-6" />
            <span className="font-semibold">Create Reminder</span>
            <span className="text-xs text-muted-foreground">For clients</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-view-clients">
          <Link href="/tools/assets">
            <Users className="h-6 w-6" />
            <span className="font-semibold">Client Assets</span>
            <span className="text-xs text-muted-foreground">All installations</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-revenue-report">
          <Link href="/tools/reports">
            <TrendingUp className="h-6 w-6" />
            <span className="font-semibold">Revenue Report</span>
            <span className="text-xs text-muted-foreground">Monthly breakdown</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-manage-billing">
          <Link href="/pricing">
            <Zap className="h-6 w-6" />
            <span className="font-semibold">Billing</span>
            <span className="text-xs text-muted-foreground">Quota & upgrades</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
