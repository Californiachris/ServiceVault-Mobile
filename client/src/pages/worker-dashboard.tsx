import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  QrCode, Clock, CheckCircle, Calendar, MapPin, 
  Building2, Phone, Mail, User, Wrench, TrendingUp
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: worker } = useQuery<any>({
    queryKey: ['/api/worker/profile'],
    enabled: !!user && user.role === 'WORKER',
  });

  const { data: contractor } = useQuery<any>({
    queryKey: ['/api/worker/contractor'],
    enabled: !!user && user.role === 'WORKER',
  });

  const { data: activeVisits = [] } = useQuery<any[]>({
    queryKey: ['/api/worker/visits/active'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: recentVisits = [] } = useQuery<any[]>({
    queryKey: ['/api/worker/visits/recent'],
    enabled: !!user,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/worker/stats'],
    enabled: !!user,
  });

  const activeVisit = activeVisits[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent" style={{letterSpacing: '-0.02em'}}>
              Welcome, {user?.firstName || 'Worker'}
            </h1>
            <p className="text-xl text-muted-foreground mt-2">
              {contractor?.name || 'Loading...'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={() => setLocation("/worker/check-in")}
              className="font-bold"
              data-testid="button-check-in"
            >
              <QrCode className="mr-2 h-5 w-5" />
              Check In / Scan QR
            </Button>
          </div>
        </div>

        {/* Active Visit Banner */}
        {activeVisit && (
          <Card className="border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Active Visit</CardTitle>
                    <CardDescription>Started {formatDistanceToNow(new Date(activeVisit.checkInTime))} ago</CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="bg-cyan-500 text-white px-4 py-2 text-sm">
                  In Progress
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{activeVisit.propertyName || 'Property Visit'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{activeVisit.propertyAddress || 'Location'}</span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  onClick={() => setLocation(`/worker/visit/${activeVisit.id}`)}
                  size="lg"
                  variant="default"
                  className="w-full sm:w-auto"
                  data-testid="button-continue-visit"
                >
                  Continue Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalVisits || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time check-ins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalHours?.toFixed(1) || '0.0'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completedTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                This week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recent Visits</CardTitle>
            <CardDescription>Your latest property check-ins and completions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVisits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">No recent visits</p>
                <p className="text-sm mt-2">Check in to a property to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentVisits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        visit.checkOutTime ? 'bg-green-500/10' : 'bg-cyan-500/10'
                      }`}>
                        {visit.checkOutTime ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-cyan-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{visit.propertyName || 'Property Visit'}</p>
                        <p className="text-sm text-muted-foreground">
                          {visit.propertyAddress || 'No address'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(visit.checkInTime), 'MMM d, yyyy h:mm a')}
                          {visit.checkOutTime && ` - ${format(new Date(visit.checkOutTime), 'h:mm a')}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={visit.checkOutTime ? "secondary" : "default"}>
                        {visit.checkOutTime ? 'Completed' : 'In Progress'}
                      </Badge>
                      {visit.duration && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {(visit.duration / 60).toFixed(1)} hours
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contractor Info */}
        {contractor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Contractor</CardTitle>
              <CardDescription>Contact information and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{contractor.name}</span>
              </div>
              {contractor.companyPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{contractor.companyPhone}</span>
                </div>
              )}
              {contractor.companyEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{contractor.companyEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
