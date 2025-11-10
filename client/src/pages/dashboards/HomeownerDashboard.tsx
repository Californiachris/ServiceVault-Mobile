import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Home,
  QrCode,
  FileText,
  Bell,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
  TrendingUp,
  Shield,
  Clock,
  Search
} from "lucide-react";

interface HomeownerDashboardData {
  properties: any[];
  totalAssets: number;
  documentsCount: number;
  warrantyAlerts: any[];
  recentDocuments: any[];
  upcomingReminders: any[];
  subscription: any;
}

export default function HomeownerDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data, isLoading } = useQuery<HomeownerDashboardData>({
    queryKey: ["/api/dashboard/homeowner"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  const properties = data?.properties || [];
  const totalAssets = data?.totalAssets || 0;
  const documentsCount = data?.documentsCount || 0;
  const warrantyAlerts = data?.warrantyAlerts || [];
  const recentDocuments = data?.recentDocuments || [];
  const upcomingReminders = data?.upcomingReminders || [];
  const subscription = data?.subscription;

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

  // Debounced search filtering (300ms) for properties, recent documents, and reminders
  const filteredProperties = useMemo(() => {
    if (!debouncedSearch) return properties;
    const query = debouncedSearch.toLowerCase();
    return properties.filter((prop: any) => 
      prop.name?.toLowerCase().includes(query) ||
      prop.addressLine1?.toLowerCase().includes(query) ||
      prop.city?.toLowerCase().includes(query)
    );
  }, [properties, debouncedSearch]);

  const filteredDocuments = useMemo(() => {
    if (!debouncedSearch) return recentDocuments;
    const query = debouncedSearch.toLowerCase();
    return recentDocuments.filter((doc: any) => 
      doc.name?.toLowerCase().includes(query) ||
      doc.type?.toLowerCase().includes(query)
    );
  }, [recentDocuments, debouncedSearch]);

  const filteredReminders = useMemo(() => {
    if (!debouncedSearch) return upcomingReminders;
    const query = debouncedSearch.toLowerCase();
    return upcomingReminders.filter((reminder: any) => 
      reminder.title?.toLowerCase().includes(query) ||
      reminder.description?.toLowerCase().includes(query)
    );
  }, [upcomingReminders, debouncedSearch]);

  const totalResults = filteredProperties.length + filteredDocuments.length + filteredReminders.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="heading-homeowner-dashboard">
                My Home
              </h1>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <Home className="h-3 w-3 mr-1" />
                Homeowner
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Track assets, warranties, and maintenance for peace of mind
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto" data-testid="button-scan-asset">
            <Link href="/scan">
              <QrCode className="mr-2 h-5 w-5" />
              Scan Asset QR
            </Link>
          </Button>
        </div>

        {/* AI Badge */}
        <div className="mt-4">
          <Badge className="bg-gradient-to-r from-cyan-500/10 to-orange-500/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Warranty Parsing & Maintenance Reminders — FREE
          </Badge>
        </div>
        
        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search properties, assets, documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-homeowner"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {totalResults} results
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-properties">
              {properties.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active homes & rentals
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-assets">
              {totalAssets}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Protected by FixTrack
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-documents">
              {documentsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Warranties & receipts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warranty Alerts Banner */}
      {warrantyAlerts.length > 0 && warrantyAlerts.some((w: any) => w.urgency !== 'GREEN') && (
        <div className="mb-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Warranty Expiration Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {warrantyAlerts
                  .filter((w: any) => w.urgency !== 'GREEN')
                  .slice(0, 3)
                  .map((warranty: any) => (
                    <div key={warranty.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`warranty-alert-${warranty.id}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{warranty.name || 'Warranty Document'}</p>
                        <p className="text-xs text-muted-foreground">
                          {warranty.daysUntilExpiry > 0 ? `Expires in ${warranty.daysUntilExpiry} days` : 'Expired'}
                        </p>
                      </div>
                      <Badge className={getUrgencyColor(warranty.urgency)}>
                        {getUrgencyIcon(warranty.urgency)}
                        <span className="ml-1">{warranty.urgency === 'RED' ? 'Urgent' : 'Soon'}</span>
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Properties */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  My Properties
                </CardTitle>
                <Button variant="outline" size="sm" asChild data-testid="button-add-property">
                  <Link href="/tools/assets">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Property
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProperties.length === 0 && !searchQuery ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No properties yet</p>
                  <Button asChild>
                    <Link href="/scan">
                      <QrCode className="mr-2 h-4 w-4" />
                      Scan Property QR Code
                    </Link>
                  </Button>
                </div>
              ) : filteredProperties.length === 0 && searchQuery ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No properties match "{searchQuery}"</p>
                  <Button variant="ghost" onClick={() => setSearchQuery("")} className="mt-2">
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProperties.map((property: any) => (
                    <div
                      key={property.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`property-card-${property.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {property.name || 'Unnamed Property'}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {property.addressLine1 || 'No address'}
                            {property.city && `, ${property.city}`}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Status: Active
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/property/${property.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reminders */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Upcoming
                </CardTitle>
                <Button variant="ghost" size="sm" asChild data-testid="button-view-reminders">
                  <Link href="/tools/reminders">
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReminders.length === 0 && !searchQuery ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming reminders</p>
                </div>
              ) : filteredReminders.length === 0 && searchQuery ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reminders match "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReminders.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className="p-3 bg-muted/50 rounded-lg"
                      data-testid={`reminder-${reminder.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          {getUrgencyIcon(reminder.urgency)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {reminder.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reminder.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(reminder.dueAt).toLocaleDateString()}
                              {reminder.daysUntilDue > 0 && ` (${reminder.daysUntilDue} days)`}
                            </p>
                          </div>
                        </div>
                        {reminder.urgency !== 'GREEN' && (
                          <Badge className={getUrgencyColor(reminder.urgency)} data-testid={`badge-urgency-${reminder.id}`}>
                            {reminder.urgency === 'RED' ? 'Urgent' : 'Soon'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-upload-warranty">
          <Link href="/tools/documents">
            <FileText className="h-6 w-6" />
            <span className="font-semibold">Upload Warranty</span>
            <span className="text-xs text-muted-foreground">AI parses dates</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-view-assets">
          <Link href="/tools/assets">
            <Shield className="h-6 w-6" />
            <span className="font-semibold">View All Assets</span>
            <span className="text-xs text-muted-foreground">Complete history</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-generate-report">
          <Link href="/tools/reports">
            <TrendingUp className="h-6 w-6" />
            <span className="font-semibold">Health Report</span>
            <span className="text-xs text-muted-foreground">Property certificate</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild data-testid="button-manage-settings">
          <Link href="/settings">
            <Bell className="h-6 w-6" />
            <span className="font-semibold">Notifications</span>
            <span className="text-xs text-muted-foreground">Email & SMS</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
