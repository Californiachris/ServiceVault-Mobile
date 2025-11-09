import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileBarChart, 
  Download, 
  Home, 
  CheckCircle2,
  FileText,
  ClipboardCheck,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function ReportsToolView() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/properties", selectedProperty, "stats"],
    enabled: isAuthenticated && !!selectedProperty,
    retry: false,
  });

  const generateReportMutation = useMutation({
    mutationFn: async (propertyId?: string) => {
      const response = await apiRequest("POST", "/api/reports/home-health", {
        propertyId: propertyId || undefined,
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `home-health-certificate-${propertyId || 'all'}-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Your Home Health Certificate™ has been downloaded successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    if (!selectedProperty) {
      toast({
        title: "Property Required",
        description: "Please select a property to generate the report",
        variant: "destructive",
      });
      return;
    }
    generateReportMutation.mutate(selectedProperty);
  };

  const selectedPropertyData = properties?.find((p: any) => p.id === selectedProperty);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Home Health Certificate™</h3>
        <p className="text-muted-foreground">
          Generate professional PDF reports with complete property history, asset details, inspection records, and documentation for buyers, inspectors, or insurance.
        </p>
      </div>

      <Separator />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Generation Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileBarChart className="h-5 w-5" />
                Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {propertiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : properties && properties.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Property</label>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Choose a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property: any) => (
                          <SelectItem key={property.id} value={property.id}>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              {property.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPropertyData && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-sm font-medium">{selectedPropertyData.name}</p>
                      {selectedPropertyData.addressLine1 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedPropertyData.addressLine1}
                          {selectedPropertyData.city && `, ${selectedPropertyData.city}`}
                          {selectedPropertyData.state && `, ${selectedPropertyData.state}`}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateReport}
                    disabled={!selectedProperty || generateReportMutation.isPending}
                    className="w-full"
                    size="lg"
                    data-testid="button-generate-pdf"
                  >
                    {generateReportMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Generate PDF Report
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">No Properties Found</p>
                    <p className="text-sm text-muted-foreground">
                      Add a property by claiming an asset first
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Property Overview</p>
                    <p className="text-xs text-muted-foreground">Address, ownership, and key details</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Complete Asset Inventory</p>
                    <p className="text-xs text-muted-foreground">All tracked assets with installation dates</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Service History</p>
                    <p className="text-xs text-muted-foreground">Maintenance, repairs, and inspections</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Active Warranties</p>
                    <p className="text-xs text-muted-foreground">Current warranty coverage details</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Tamper-Proof Verification</p>
                    <p className="text-xs text-muted-foreground">Hash-chain validated event history</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProperty ? (
                statsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Home className="h-5 w-5 text-blue-500" />
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Assets</Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats?.assetCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Tracked Assets</p>
                      </div>

                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <FileText className="h-5 w-5 text-purple-500" />
                          <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Documents</Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats?.documentCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Uploaded Files</p>
                      </div>

                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <ClipboardCheck className="h-5 w-5 text-green-500" />
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Inspections</Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats?.inspectionCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Completed Inspections</p>
                      </div>

                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Calendar className="h-5 w-5 text-orange-500" />
                          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Events</Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats?.eventCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Service Events</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Report Contents</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Property details and identification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Complete asset inventory with specifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Maintenance and service history timeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Active warranty coverage summary</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Inspection results and compliance records</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>Hash-chain verification for data integrity</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <FileBarChart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Select a property to preview report contents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
