import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import Navigation from "@/components/ui/navigation";
import StatsCard from "@/components/ui/stats-card";
import ToolCard from "@/components/ui/tool-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Wrench, 
  Upload, 
  BarChart3, 
  CheckCircle2, 
  Bell,
  Download,
  Plus,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Home,
  Building2,
  Truck,
  Sparkles
} from "lucide-react";

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

  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeAssets?: number;
    qrCodesGenerated?: number;
    propertiesManaged?: number;
    activeSubscriptions?: number;
    quotaUsed?: number;
    quotaTotal?: number;
    activeJobs?: number;
    fleetAssets?: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const userRole = user.role || "HOMEOWNER";

  // Role-specific stats
  const getDashboardStats = () => {
    switch (userRole) {
      case "CONTRACTOR":
        return [
          { 
            label: "Quota Used", 
            value: `${stats?.quotaUsed || 0}/${stats?.quotaTotal || 50}`, 
            icon: QrCode,
            trend: "up" as const
          },
          { 
            label: "Active Jobs", 
            value: (stats?.activeJobs || 0).toString(), 
            icon: Wrench,
            trend: "up" as const
          },
          { 
            label: "Assets Installed", 
            value: (stats?.activeAssets || 0).toString(), 
            icon: CheckCircle2,
            trend: "up" as const
          },
          { 
            label: "Active Reminders", 
            value: (stats?.activeSubscriptions || 0).toString(), 
            icon: Bell,
            trend: "up" as const
          },
        ];
      
      case "FLEET":
        return [
          { 
            label: "Fleet Assets", 
            value: (stats?.fleetAssets || 0).toString(), 
            icon: Truck,
            trend: "up" as const
          },
          { 
            label: "Active Service", 
            value: (stats?.activeJobs || 0).toString(), 
            icon: Wrench,
            trend: "up" as const
          },
          { 
            label: "Maintenance Due", 
            value: (stats?.activeSubscriptions || 0).toString(), 
            icon: AlertTriangle,
            trend: "down" as const
          },
          { 
            label: "Total Properties", 
            value: (stats?.propertiesManaged || 0).toString(), 
            icon: Building2,
            trend: "up" as const
          },
        ];

      default: // HOMEOWNER
        return [
          { 
            label: "My Assets", 
            value: (stats?.activeAssets || 0).toString(), 
            icon: Home,
            trend: "up" as const
          },
          { 
            label: "Active Warranties", 
            value: (stats?.qrCodesGenerated || 0).toString(), 
            icon: CheckCircle2,
            trend: "up" as const
          },
          { 
            label: "Properties", 
            value: (stats?.propertiesManaged || 0).toString(), 
            icon: Building2,
            trend: "up" as const
          },
          { 
            label: "Upcoming Reminders", 
            value: (stats?.activeSubscriptions || 0).toString(), 
            icon: Bell,
            trend: "up" as const
          },
        ];
    }
  };

  const dashboardStats = getDashboardStats();

  const tools = [
    {
      title: "Asset Management",
      description: "View and manage your assets, installation records, and service history. Scan pre-printed FixTrack stickers to log new assets.",
      icon: Wrench,
      status: "Core",
      statusColor: "blue" as const,
      href: "/tools/assets",
    },
    {
      title: "Document Storage",
      description: "Upload and organize warranties, receipts, manuals, and inspection reports for easy access.",
      icon: Upload,
      status: "Essential",
      statusColor: "purple" as const,
      href: "/tools/documents",
    },
    {
      title: "Health Reports",
      description: "Generate professional Home Health Certificate™ PDFs with complete property and asset timelines.",
      icon: BarChart3,
      status: "Premium",
      statusColor: "orange" as const,
      href: "/tools/reports",
    },
    {
      title: "Inspection Logs",
      description: "Record inspection results with digital checklists and inspector signatures for compliance tracking.",
      icon: CheckCircle2,
      status: "Professional",
      statusColor: "cyan" as const,
      href: "/tools/inspections",
    },
    {
      title: "Smart Reminders",
      description: "Automatic notifications for warranty expirations, maintenance schedules, and service intervals.",
      icon: Bell,
      status: "Automated",
      statusColor: "red" as const,
      href: "/tools/reminders",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" data-testid="heading-dashboard">Dashboard</h1>
              {userRole === "HOMEOWNER" && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <Home className="h-3 w-3 mr-1" />
                  Homeowner
                </Badge>
              )}
              {userRole === "CONTRACTOR" && (
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                  <Building2 className="h-3 w-3 mr-1" />
                  Contractor
                </Badge>
              )}
              {userRole === "FLEET" && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                  <Truck className="h-3 w-3 mr-1" />
                  Fleet Manager
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground" data-testid="text-welcome">
              {userRole === "HOMEOWNER" && "Track your assets, warranties, and maintenance schedules."}
              {userRole === "CONTRACTOR" && "Manage your jobs, sticker quota, and installations."}
              {userRole === "FLEET" && "Monitor your fleet assets, maintenance, and driver activity."}
            </p>
            <Badge className="mt-2 bg-primary/10 text-primary border-primary/20" data-testid="badge-ai-free">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Predictive Maintenance — FREE
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" data-testid="button-export-data">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button asChild data-testid="button-scan-qr">
              <Link href="/scan">
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, index) => (
            <StatsCard 
              key={index} 
              {...stat} 
              isLoading={statsLoading}
            />
          ))}
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <QrCode className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">QR Code Generated</p>
                      <p className="text-xs text-muted-foreground">Created 50 asset identifiers for Main Residence</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Asset Claimed</p>
                      <p className="text-xs text-muted-foreground">HVAC System bound to property via QR scan</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Upload className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Document Uploaded</p>
                      <p className="text-xs text-muted-foreground">Warranty certificate for Water Heater</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Reminder Due</p>
                      <p className="text-xs text-muted-foreground">Electrical panel inspection overdue</p>
                      <p className="text-xs text-muted-foreground">3 days overdue</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    asChild
                    data-testid="button-upload-document"
                  >
                    <Link href="/tools/documents">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    asChild
                    data-testid="button-generate-report"
                  >
                    <Link href="/tools/reports">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Generate Report
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    asChild
                    data-testid="button-manage-assets"
                  >
                    <Link href="/tools/assets">
                      <Wrench className="mr-2 h-4 w-4" />
                      Manage Assets
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tools Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Management Tools</h2>
            <Button variant="outline" size="sm" data-testid="button-view-all-tools">
              View All Tools
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <ToolCard key={index} {...tool} />
            ))}
          </div>
        </div>

        {/* Properties Summary */}
        {properties && properties.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Properties</span>
                  <Button size="sm" asChild data-testid="button-add-property">
                    <Link href="/tools/assets">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Property
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.slice(0, 6).map((property: any) => (
                    <div 
                      key={property.id} 
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`property-card-${property.id}`}
                    >
                      <h3 className="font-semibold mb-1">{property.name || 'Unnamed Property'}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {property.addressLine1 ? `${property.addressLine1}, ${property.city || ''}` : 'No address'}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Status: {property.homeStatus || 'Active'}</span>
                        <span>Plan: {property.homePlan || 'None'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
