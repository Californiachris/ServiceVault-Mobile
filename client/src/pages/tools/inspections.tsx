import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ClipboardCheck, 
  Home, 
  Plus, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  MapPin
} from "lucide-react";

interface InspectionFormData {
  propertyId: string;
  jurisdiction: string;
  notes: string;
  checklist: {
    electrical: boolean;
    plumbing: boolean;
    hvac: boolean;
    structural: boolean;
    safety: boolean;
    [key: string]: boolean;
  };
  result: 'PASS' | 'FAIL' | 'NOTES';
}

const INSPECTION_CHECKLIST = [
  { key: 'electrical', label: 'Electrical Systems', description: 'Panel, outlets, GFCI, grounding' },
  { key: 'plumbing', label: 'Plumbing Systems', description: 'Water pressure, leaks, drainage' },
  { key: 'hvac', label: 'HVAC Systems', description: 'Heating, cooling, ventilation' },
  { key: 'structural', label: 'Structural Elements', description: 'Foundation, framing, roof' },
  { key: 'safety', label: 'Safety Features', description: 'Smoke detectors, CO detectors, exits' },
  { key: 'insulation', label: 'Insulation & Weatherization', description: 'Energy efficiency, air sealing' },
  { key: 'windows', label: 'Windows & Doors', description: 'Operation, sealing, security' },
  { key: 'exterior', label: 'Exterior Conditions', description: 'Siding, gutters, landscaping drainage' },
];

export default function InspectionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState<InspectionFormData>({
    propertyId: '',
    jurisdiction: '',
    notes: '',
    checklist: {
      electrical: false,
      plumbing: false,
      hvac: false,
      structural: false,
      safety: false,
      insulation: false,
      windows: false,
      exterior: false,
    },
    result: 'PASS',
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ["/api/inspections", formData.propertyId],
    enabled: isAuthenticated && !!formData.propertyId,
    retry: false,
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: InspectionFormData) => {
      const response = await apiRequest("POST", "/api/inspections", {
        propertyId: data.propertyId,
        jurisdiction: data.jurisdiction || undefined,
        checklist: {
          ...data.checklist,
          notes: data.notes,
        },
        result: data.result,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inspection Recorded",
        description: "Inspection results have been saved successfully",
      });
      // Reset form
      setFormData({
        propertyId: '',
        jurisdiction: '',
        notes: '',
        checklist: {
          electrical: false,
          plumbing: false,
          hvac: false,
          structural: false,
          safety: false,
          insulation: false,
          windows: false,
          exterior: false,
        },
        result: 'PASS',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
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
        title: "Inspection Failed",
        description: error.message || "Failed to record inspection",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyId) {
      toast({
        title: "Missing Property",
        description: "Please select a property for this inspection",
        variant: "destructive",
      });
      return;
    }

    createInspectionMutation.mutate(formData);
  };

  const handleChecklistChange = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: checked,
      },
    }));
  };

  const getOverallScore = () => {
    const totalItems = INSPECTION_CHECKLIST.length;
    const checkedItems = INSPECTION_CHECKLIST.filter(item => 
      formData.checklist[item.key]
    ).length;
    return Math.round((checkedItems / totalItems) * 100);
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
          <h1 className="text-3xl font-bold mb-2">Property Inspections</h1>
          <p className="text-muted-foreground">
            Record inspection results with digital checklists and inspector signatures for compliance tracking.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Inspection Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="property">Property *</Label>
                    {propertiesLoading ? (
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Select 
                        value={formData.propertyId} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, propertyId: value }))}
                      >
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select property to inspect" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties?.map((property: any) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{property.name || 'Unnamed Property'}</span>
                                {property.addressLine1 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {property.city || property.addressLine1}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      placeholder="e.g., City of Anytown, County Building Dept"
                      value={formData.jurisdiction}
                      onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                      data-testid="input-jurisdiction"
                    />
                    <p className="text-xs text-muted-foreground">
                      Inspecting authority or organization
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Inspection Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Inspection Checklist
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {getOverallScore()}% Complete
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {INSPECTION_CHECKLIST.map((item) => (
                      <div 
                        key={item.key}
                        className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <Checkbox
                          id={item.key}
                          checked={formData.checklist[item.key]}
                          onCheckedChange={(checked) => 
                            handleChecklistChange(item.key, checked as boolean)
                          }
                          data-testid={`checkbox-${item.key}`}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={item.key} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {item.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        {formData.checklist[item.key] && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Result and Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Inspection Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="result">Overall Result *</Label>
                    <Select 
                      value={formData.result} 
                      onValueChange={(value: 'PASS' | 'FAIL' | 'NOTES') => 
                        setFormData(prev => ({ ...prev, result: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-result">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            Pass - No Issues Found
                          </div>
                        </SelectItem>
                        <SelectItem value="FAIL">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            Fail - Issues Require Attention
                          </div>
                        </SelectItem>
                        <SelectItem value="NOTES">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-400" />
                            Notes Only - No Pass/Fail
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Inspector Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter detailed findings, recommendations, or areas requiring attention..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      data-testid="textarea-notes"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createInspectionMutation.isPending || !formData.propertyId}
                    className="w-full"
                    data-testid="button-submit-inspection"
                  >
                    {createInspectionMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Recording Inspection...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Record Inspection
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Inspections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Inspections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inspectionsLoading ? (
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                ) : inspections && inspections.length > 0 ? (
                  <div className="space-y-3">
                    {inspections.slice(0, 5).map((inspection: any) => (
                      <div 
                        key={inspection.id}
                        className="p-3 border border-border rounded-lg"
                        data-testid={`inspection-${inspection.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={
                              inspection.result === 'PASS' ? 'default' : 
                              inspection.result === 'FAIL' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {inspection.result}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(inspection.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {inspection.jurisdiction && (
                          <p className="text-sm font-medium mb-1">
                            {inspection.jurisdiction}
                          </p>
                        )}
                        
                        {inspection.checklist?.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {inspection.checklist.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {formData.propertyId 
                        ? 'No inspections recorded for this property yet' 
                        : 'Select a property to view inspections'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Inspection Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Check all applicable systems and components thoroughly
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Document all findings and recommendations clearly
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Include jurisdiction for official compliance tracking
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Results are linked to property for transfer documentation
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
