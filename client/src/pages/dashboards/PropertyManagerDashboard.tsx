import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import BrandedHeader from "@/components/BrandedHeader";
import { 
  Building2, 
  Users, 
  ClipboardList, 
  AlertTriangle, 
  Sparkles,
  Search,
  QrCode,
  Plus,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface PropertyManagerDashboardData {
  stats: {
    totalProperties: number;
    activeWorkers: number;
    pendingTasksCount: number;
    urgentReportsCount: number;
    visitsToday: number;
    tasksCompletedThisWeek: number;
    newReportsThisWeek: number;
  };
  properties: Array<any>;
  workers: Array<any>;
  recentVisits: Array<any>;
  pendingTasks: Array<any>;
  overdueTasks: Array<any>;
  urgentReports: Array<any>;
  pendingReports: Array<any>;
}

export default function PropertyManagerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<PropertyManagerDashboardData>({
    queryKey: ["/api/dashboard/property-manager"],
    retry: false,
  });

  // Search across properties, workers, tasks, reports
  const totalResults = useMemo(() => {
    if (!data || !searchQuery) return 0;
    const query = searchQuery.toLowerCase();
    let count = 0;
    
    count += data.properties?.filter((p: any) => 
      p.property?.name?.toLowerCase().includes(query) ||
      p.property?.addressLine1?.toLowerCase().includes(query) ||
      p.property?.city?.toLowerCase().includes(query)
    ).length || 0;
    
    count += data.workers?.filter((w: any) => 
      w.name?.toLowerCase().includes(query) ||
      w.role?.toLowerCase().includes(query) ||
      w.phone?.includes(query)
    ).length || 0;
    
    count += data.pendingTasks?.filter((t: any) => 
      t.task?.title?.toLowerCase().includes(query) ||
      t.task?.description?.toLowerCase().includes(query)
    ).length || 0;
    
    count += data.urgentReports?.filter((r: any) => 
      r.report?.title?.toLowerCase().includes(query) ||
      r.report?.description?.toLowerCase().includes(query)
    ).length || 0;
    
    return count;
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
        <div className="space-y-8">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalProperties: 0,
    activeWorkers: 0,
    pendingTasksCount: 0,
    urgentReportsCount: 0,
    visitsToday: 0,
    tasksCompletedThisWeek: 0,
    newReportsThisWeek: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
      {/* Branded Header */}
      <BrandedHeader 
        sector="property_manager"
        subtitle="Oversee properties, manage workers, track tasks & reports"
      />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="heading-property-manager-dashboard">
                Property Management
              </h1>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Building2 className="h-3 w-3 mr-1" />
                Property Manager
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Oversee properties, manage workers, track tasks & reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild data-testid="button-add-property">
              <Link href="/property-manager/properties">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </Button>
            <Button asChild size="lg" data-testid="button-add-worker">
              <Link href="/property-manager/workers">
                <Users className="mr-2 h-5 w-5" />
                Manage Workers
              </Link>
            </Button>
          </div>
        </div>

        {/* AI Badge */}
        <div className="mt-4">
          <Badge className="bg-gradient-to-r from-cyan-500/10 to-orange-500/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Task Scheduling & Predictive Maintenance — FREE
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search properties, workers, tasks, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-property-manager"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {totalResults} results
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow" data-testid="card-total-properties">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">Under management</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow" data-testid="card-active-workers">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeWorkers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.visitsToday} visits today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow" data-testid="card-pending-tasks">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.tasksCompletedThisWeek} completed this week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow" data-testid="card-urgent-reports">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Urgent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.urgentReportsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.newReportsThisWeek} new this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Visits */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Recent Worker Activity
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property-manager/visits">
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.recentVisits || data.recentVisits.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No recent visits</p>
                  <p className="text-sm text-muted-foreground">Workers will appear here when they check in</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentVisits.map((visit: any) => (
                    <div
                      key={visit.visit.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      data-testid={`visit-${visit.visit.id}`}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{visit.worker?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {visit.worker?.role}
                          </Badge>
                          {visit.visit.status === 'IN_PROGRESS' && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {visit.property?.property?.name || 'Property'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Checked in {format(new Date(visit.visit.checkInAt), 'h:mm a')}
                          </span>
                          {visit.visit.checkOutAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Checked out {format(new Date(visit.visit.checkOutAt), 'h:mm a')}
                            </span>
                          )}
                          {visit.visit.tasksCompleted > 0 && (
                            <span>{visit.visit.tasksCompleted} tasks completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Urgent Reports */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Urgent Reports
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property-manager/reports">
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.urgentReports || data.urgentReports.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No urgent reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.urgentReports.slice(0, 5).map((report: any) => (
                    <div
                      key={report.report.id}
                      className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer"
                      data-testid={`urgent-report-${report.report.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-sm line-clamp-1">{report.report.title}</span>
                        <Badge variant="outline" className="text-xs border-red-500/20 text-red-500">
                          {report.report.issueType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {report.report.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{report.property?.property?.name || 'Property'}</span>
                        <span>{format(new Date(report.report.reportedAt), 'MMM d')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {data?.overdueTasks && data.overdueTasks.length > 0 && (
        <Card className="mb-8 border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Overdue Tasks ({data.overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.overdueTasks.slice(0, 3).map((task: any) => (
                <div
                  key={task.task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                  data-testid={`overdue-task-${task.task.id}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">{task.task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.property?.property?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs border-red-500/20 text-red-500">
                      Due {format(new Date(task.task.dueDate), 'MMM d')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {data.overdueTasks.length > 3 && (
              <Button variant="ghost" size="sm" asChild className="w-full mt-3">
                <Link href="/property-manager/tasks">
                  View all {data.overdueTasks.length} overdue tasks
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/property-manager/properties">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-500 mb-1">Properties</h3>
                <p className="text-sm text-muted-foreground">Manage all properties</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/property-manager/tasks">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardList className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-500 mb-1">Tasks</h3>
                <p className="text-sm text-muted-foreground">Assign & track tasks</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/property-manager/workers">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-500 mb-1">Workers</h3>
                <p className="text-sm text-muted-foreground">Manage your team</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
