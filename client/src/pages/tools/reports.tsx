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
import { 
  FileBarChart, 
  Download, 
  Printer, 
  Share, 
  Home, 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  FileText
} from "lucide-react";

export default function ReportsPage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const { data: properties, isLoading: propertiesLoading } = useQuery<any>({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const generateReportMutation = useMutation({
    mutationFn: async (propertyId?: string) => {
      const response = await apiRequest("POST", "/api/reports/home-health", {
        propertyId: propertyId || undefined,
      });
      
      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `home-health-certificate-${propertyId || 'default'}-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Your Home Health Certificate™ has been downloaded",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate(selectedProperty);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Home Health Certificate™</h1>
          <p className="text-slate-300">
            Generate professional PDF reports with complete property and asset history for inspections, sales, and insurance.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Report Generation */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5" />
                  Generate Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {propertiesLoading ? (
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
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
                              <div className="flex items-center justify-between w-full">
                                <span>{property.name || 'Unnamed Property'}</span>
                                {property.homeStatus && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {property.homeStatus}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">
                        {selectedProperty 
                          ? 'Generate report for selected property' 
                          : 'Select a property or generate for your first property'
                        }
                      </p>
                    </div>

                    <Button 
                      onClick={handleGenerateReport}
                      disabled={generateReportMutation.isPending}
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                      data-testid="button-generate-report"
                    >
                      {generateReportMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Generate Certificate
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Home className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">No Properties Found</h3>
                    <p className="text-sm text-slate-300 mb-4">
                      You need at least one property to generate a report.
                    </p>
                    <Button variant="outline" asChild data-testid="button-create-property">
                      <a href="/tools/assets">
                        Create Property
                      </a>
                    </Button>
                  </div>
                )}

                {/* Report Options */}
                <div className="space-y-3 pt-4 border-t border-slate-700/50">
                  <h4 className="text-sm font-medium">Report Options</h4>
                  
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Certificate
                      <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                      <Share className="mr-2 h-4 w-4" />
                      Share with Inspector
                      <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Auto-Reports
                      <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Preview & Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* What's Included */}
            <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle>What's Included in Your Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Property Information</h4>
                        <p className="text-sm text-slate-400">Complete address, ownership details, and master identifier code</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Asset Inventory</h4>
                        <p className="text-sm text-slate-400">Complete list of tracked assets with installation dates and categories</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Service History</h4>
                        <p className="text-sm text-slate-400">Timeline of installations, maintenance, and service events</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Inspection Records</h4>
                        <p className="text-sm text-slate-400">Official inspection results and compliance documentation</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Document Summary</h4>
                        <p className="text-sm text-slate-400">Count and types of warranties, receipts, and manuals on file</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Professional Formatting</h4>
                        <p className="text-sm text-slate-400">Official letterhead with timestamps and verification codes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Use Cases */}
            <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Perfect For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Home className="text-blue-400 h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Property Sales</h3>
                    <p className="text-sm text-slate-400">
                      Provide buyers with complete transparency about property condition and maintenance history.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="text-green-400 h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Inspections</h3>
                    <p className="text-sm text-slate-400">
                      Give inspectors immediate access to all asset information, warranties, and service records.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <FileText className="text-purple-400 h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Insurance Claims</h3>
                    <p className="text-sm text-slate-400">
                      Document asset values, installation dates, and maintenance for insurance purposes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample Report Preview */}
            <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Sample Report Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-mono text-lg font-bold">ServiceVault — Home Health Certificate™</h4>
                      <Badge variant="outline">PDF</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-400">
                      <p><strong>Property:</strong> Main Residence</p>
                      <p><strong>Owner:</strong> John Doe (john@example.com)</p>
                      <p><strong>Address:</strong> 123 Main Street, Anytown CA 90210</p>
                      <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                      <p><strong>Master Code:</strong> M-HOUSE-2024-H1R8</p>
                    </div>
                  </div>
                  
                  <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/40">
                    <h4 className="font-semibold mb-2">Assets Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>• HVAC System [HVAC] - Trane XR16</span>
                        <span className="text-slate-400">Installed: Mar 15, 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Water Heater [PLUMBING] - Rheem 50 Gal</span>
                        <span className="text-slate-400">Installed: Jan 20, 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Electrical Panel [ELECTRICAL] - Square D 200A</span>
                        <span className="text-slate-400">Installed: Feb 8, 2024</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-slate-400">
                      Full reports include complete event timelines, document counts, and professional formatting.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
