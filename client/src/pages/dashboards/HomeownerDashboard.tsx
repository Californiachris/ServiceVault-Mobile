import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/use-entitlements";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DashboardTabs } from "@/components/DashboardTabs";
import { MasterQRDialog } from "@/components/MasterQRDialog";
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
  Search,
  ChevronRight,
  Building,
  Building2,
  Warehouse,
  FileCheck
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

interface UserPreferences {
  role: string;
  propertyTypes: string[];
  industries: string[];
  specialties: string[];
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  SINGLE_FAMILY: "Single Family",
  CONDO: "Condo",
  MULTI_FAMILY: "Multi-Family",
  COMMERCIAL: "Commercial",
};

const PROPERTY_TYPE_ICONS: Record<string, any> = {
  SINGLE_FAMILY: Home,
  CONDO: Building,
  MULTI_FAMILY: Building2,
  COMMERCIAL: Warehouse,
};

export default function HomeownerDashboard() {
  const { user } = useAuth();
  const { isLoading: entitlementsLoading } = useEntitlements();
  const [searchQuery, setSearchQuery] = useState("");
  const [activePropertyType, setActivePropertyType] = useState<string>("ALL");
  const [masterQRDialog, setMasterQRDialog] = useState<{ open: boolean; propertyId: string; propertyName: string }>({
    open: false,
    propertyId: "",
    propertyName: "",
  });
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data, isLoading } = useQuery<HomeownerDashboardData>({
    queryKey: ["/api/dashboard/homeowner"],
    retry: false,
  });

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    retry: false,
  });

  // Fetch warranty summaries for all properties
  const propertyIds = (data?.properties || []).map((p: any) => p.id);
  const { data: warrantySummaries, isLoading: warrantiesLoading } = useQuery({
    queryKey: ["/api/warranties/properties", propertyIds],
    enabled: propertyIds.length > 0,
    queryFn: async () => {
      const summaries = await Promise.all(
        propertyIds.map(async (propertyId: string) => {
          const res = await fetch(`/api/warranties/property/${propertyId}`);
          if (!res.ok) return [];
          return res.json();
        })
      );
      return summaries.flat();
    },
  });

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

  // Normalize property type - treat missing/unknown as GENERAL
  const normalizePropertyType = (type: string | null | undefined): string => {
    if (!type || !PROPERTY_TYPE_LABELS[type]) return "GENERAL";
    return type;
  };

  // Generate property type tabs based on user's selections
  const propertyTypeTabs = useMemo(() => {
    const userTypes = preferences?.propertyTypes || [];
    const tabs: Array<{ id: string; label: string; icon: any; count?: number }> = [
      { id: "ALL", label: "All Properties", icon: Home }
    ];
    
    // Check if there are any properties with missing/unknown types
    const hasGeneralProperties = properties.some((p: any) => normalizePropertyType(p.propertyType) === "GENERAL");
    
    userTypes.forEach((type: string) => {
      if (PROPERTY_TYPE_LABELS[type]) {
        tabs.push({
          id: type,
          label: PROPERTY_TYPE_LABELS[type],
          icon: PROPERTY_TYPE_ICONS[type],
          count: properties.filter((p: any) => p.propertyType === type).length,
        });
      }
    });
    
    // Add GENERAL tab if there are properties with missing types
    if (hasGeneralProperties) {
      tabs.push({
        id: "GENERAL",
        label: "General",
        icon: Building,
        count: properties.filter((p: any) => normalizePropertyType(p.propertyType) === "GENERAL").length,
      });
    }
    
    return tabs;
  }, [preferences?.propertyTypes, properties]);

  // Filter properties by active tab and search
  const filteredProperties = useMemo(() => {
    let filtered = properties;
    
    // Filter by property type tab
    if (activePropertyType !== "ALL") {
      if (activePropertyType === "GENERAL") {
        // Show properties with missing/unknown types
        filtered = filtered.filter((prop: any) => normalizePropertyType(prop.propertyType) === "GENERAL");
      } else {
        filtered = filtered.filter((prop: any) => prop.propertyType === activePropertyType);
      }
    }
    
    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter((prop: any) => 
        prop.name?.toLowerCase().includes(query) ||
        prop.addressLine1?.toLowerCase().includes(query) ||
        prop.city?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [properties, activePropertyType, debouncedSearch]);

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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
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
              Protected by ServiceVault
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

      {/* Property Type Tabs */}
      {propertyTypeTabs.length > 1 && (
        <div className="mb-6">
          <DashboardTabs
            tabs={propertyTypeTabs}
            activeValue={activePropertyType}
            onChange={setActivePropertyType}
          />
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
                  {filteredProperties.map((property: any) => {
                    const PropertyIcon = property.propertyType ? PROPERTY_TYPE_ICONS[property.propertyType] || Home : Home;
                    return (
                      <div
                        key={property.id}
                        className="group rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200"
                        data-testid={`property-card-${property.id}`}
                      >
                        <Link href={`/property/${property.id}`}>
                          <div className="flex items-center gap-4 p-4 cursor-pointer">
                            {/* Property Type Icon */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <PropertyIcon className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            
                            {/* Property Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                  {property.name || 'Unnamed Property'}
                                </h3>
                                {property.propertyType && PROPERTY_TYPE_LABELS[property.propertyType] && (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                                    {PROPERTY_TYPE_LABELS[property.propertyType]}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {property.addressLine1 || 'No address'}
                                {property.city && `, ${property.city}`}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-xs">
                                  <Shield className="h-3 w-3 text-green-500" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                                </span>
                                {property.masterIdentifierId && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <QrCode className="h-3 w-3" />
                                    QR Active
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </Link>
                        
                        {/* Master QR Button - Outside Link */}
                        <div className="px-4 pb-4 border-t border-border/50 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMasterQRDialog({
                                open: true,
                                propertyId: property.id,
                                propertyName: property.name || 'Unnamed Property',
                              });
                            }}
                            disabled={entitlementsLoading}
                            data-testid={`button-master-qr-${property.id}`}
                            className="w-full"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Master QR Code
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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

        {/* AI-Parsed Warranty Summaries */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Warranty Summaries
                  <Sparkles className="h-4 w-4 text-blue-500" />
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {warrantiesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : !warrantySummaries || warrantySummaries.length === 0 ? (
                <div className="text-center py-8">
                  <FileCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No warranty summaries yet</p>
                  <p className="text-xs text-muted-foreground">Upload warranty documents to auto-parse with AI</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warrantySummaries.slice(0, 5).map((summary: any) => (
                    <div
                      key={summary.id}
                      className="p-3 bg-muted/50 rounded-lg border border-border"
                      data-testid={`warranty-summary-${summary.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileCheck className="h-4 w-4 text-blue-500" />
                            <p className="text-sm font-medium">
                              {summary.parsedData?.productName || summary.parsedData?.brand || 'Warranty Document'}
                            </p>
                            {summary.parsedData?.brand && summary.parsedData?.model && (
                              <Badge variant="outline" className="text-xs">
                                {summary.parsedData.model}
                              </Badge>
                            )}
                          </div>
                          {summary.parsedData?.warrantyEndDate && (
                            <p className="text-xs text-muted-foreground">
                              Valid until: {new Date(summary.parsedData.warrantyEndDate).toLocaleDateString()}
                            </p>
                          )}
                          {summary.parsedData?.maintenanceSchedule && summary.parsedData.maintenanceSchedule.length > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              {summary.parsedData.maintenanceSchedule.length} maintenance reminder{summary.parsedData.maintenanceSchedule.length > 1 ? 's' : ''} created
                            </p>
                          )}
                          {summary.confidence && (
                            <p className="text-xs text-muted-foreground mt-1">
                              AI Confidence: {Math.round(parseFloat(summary.confidence) * 100)}%
                            </p>
                          )}
                        </div>
                        <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                  {warrantySummaries.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      Showing 5 of {warrantySummaries.length} warranties
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions - Premium Design with Visual Hierarchy */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {/* PRIMARY ACTION: Upload Warranty - Bold Gradient */}
          <Link href="/tools/documents" data-testid="button-upload-warranty">
            <Card className="group relative overflow-hidden border-2 border-transparent bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Upload Warranty</h3>
                <p className="text-sm text-white/90">AI parses dates automatically</p>
              </CardContent>
            </Card>
          </Link>

          {/* PRIMARY ACTION: Scan QR - Bold Gradient */}
          <Link href="/scan" data-testid="button-scan-qr-quick">
            <Card className="group relative overflow-hidden border-2 border-transparent bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <QrCode className="h-8 w-8 text-white" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Scan QR Code</h3>
                <p className="text-sm text-white/90">Quick asset lookup</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* SECONDARY ACTIONS: Professional Cards with Borders */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/tools/assets" data-testid="button-view-assets">
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-semibold mb-1">View All Assets</h3>
                <p className="text-sm text-muted-foreground">Complete history & details</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tools/reports" data-testid="button-generate-report">
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Health Report</h3>
                <p className="text-sm text-muted-foreground">Property certificate</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings" data-testid="button-manage-settings">
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Bell className="h-7 w-7 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground">Email & SMS settings</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Master QR Dialog */}
      <MasterQRDialog
        propertyId={masterQRDialog.propertyId}
        propertyName={masterQRDialog.propertyName}
        open={masterQRDialog.open}
        onOpenChange={(open) => setMasterQRDialog({ ...masterQRDialog, open })}
      />
    </div>
  );
}
