import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { INSPECTION_CHECKLIST, INSPECTION_RESULTS, getGroupedInspectionChecklist } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ClipboardCheck, 
  Home, 
  ChevronDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Loader2
} from "lucide-react";

export default function InspectionsToolView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    propertyId: '',
    jurisdiction: '',
    notes: '',
    checklist: {} as Record<string, boolean>,
    result: 'PASS' as 'PASS' | 'FAIL' | 'NOTES',
  });

  const [filterProperty, setFilterProperty] = useState('');

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ["/api/inspections", filterProperty],
    enabled: isAuthenticated && !!filterProperty,
    retry: false,
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
      setFormData({
        propertyId: '',
        jurisdiction: '',
        notes: '',
        checklist: {},
        result: 'PASS',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
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
        title: "Failed to Record Inspection",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.propertyId) {
      toast({
        title: "Property Required",
        description: "Please select a property for this inspection",
        variant: "destructive",
      });
      return;
    }
    createInspectionMutation.mutate(formData);
  };

  const groupedChecklist = getGroupedInspectionChecklist();
  const totalItems = INSPECTION_CHECKLIST.length;
  const checkedItems = Object.values(formData.checklist).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Inspection Logs</h3>
        <p className="text-muted-foreground">
          Record property inspections with digital checklists and track compliance history
        </p>
      </div>

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="record" data-testid="tab-record-inspection">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Record Inspection
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-inspection-history">
            <FileText className="h-4 w-4 mr-2" />
            Inspection History
          </TabsTrigger>
        </TabsList>

        {/* Record New Inspection */}
        <TabsContent value="record" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inspection Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="property">Property *</Label>
                    <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value })}>
                      <SelectTrigger data-testid="select-inspection-property">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertiesLoading ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                        ) : properties && properties.length > 0 ? (
                          properties.map((property: any) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                {property.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">No properties found</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jurisdiction">Jurisdiction</Label>
                      <Input
                        id="jurisdiction"
                        placeholder="e.g., City Building Dept"
                        value={formData.jurisdiction}
                        onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                        data-testid="input-jurisdiction"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="result">Result *</Label>
                      <Select value={formData.result} onValueChange={(value: any) => setFormData({ ...formData, result: value })}>
                        <SelectTrigger data-testid="select-result">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INSPECTION_RESULTS.map((result) => (
                            <SelectItem key={result.value} value={result.value}>
                              {result.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Inspector Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any relevant notes, concerns, or recommendations..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      data-testid="textarea-notes"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Checklist */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Inspection Checklist</CardTitle>
                    <Badge variant="outline">
                      {checkedItems} / {totalItems} items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(groupedChecklist).map(([section, items]) => (
                    <Collapsible key={section} defaultOpen>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <span className="font-medium">{section}</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 pl-3">
                        {items.map((item) => (
                          <div key={item.key} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/30">
                            <Checkbox
                              id={item.key}
                              checked={formData.checklist[item.key] || false}
                              onCheckedChange={(checked) => 
                                setFormData({ 
                                  ...formData, 
                                  checklist: { ...formData.checklist, [item.key]: checked as boolean } 
                                })
                              }
                              data-testid={`checkbox-${item.key}`}
                            />
                            <label
                              htmlFor={item.key}
                              className="text-sm cursor-pointer flex-1"
                            >
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </label>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>

              <Button
                onClick={handleSubmit}
                disabled={!formData.propertyId || createInspectionMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-submit-inspection"
              >
                {createInspectionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording Inspection...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Record Inspection
                  </>
                )}
              </Button>
            </div>

            {/* Progress Overview */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Completion</span>
                      <span className="font-medium">{Math.round((checkedItems / totalItems) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${(checkedItems / totalItems) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {Object.entries(groupedChecklist).map(([section, items]) => {
                      const sectionChecked = items.filter(item => formData.checklist[item.key]).length;
                      const sectionTotal = items.length;
                      return (
                        <div key={section} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{section}</span>
                          <span className="font-medium">{sectionChecked}/{sectionTotal}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Inspection History */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filter History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger data-testid="select-filter-property">
                  <SelectValue placeholder="Select property to view inspections" />
                </SelectTrigger>
                <SelectContent>
                  {properties && properties.length > 0 ? (
                    properties.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {property.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">No properties found</div>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filterProperty && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspection Records</CardTitle>
              </CardHeader>
              <CardContent>
                {inspectionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : inspections && inspections.length > 0 ? (
                  <div className="space-y-3">
                    {inspections.map((inspection: any) => (
                      <div key={inspection.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">Inspection #{inspection.id.slice(0, 8)}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(inspection.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            className={
                              inspection.result === 'PASS' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              inspection.result === 'FAIL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }
                          >
                            {inspection.result}
                          </Badge>
                        </div>
                        {inspection.jurisdiction && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {inspection.jurisdiction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No inspection records found for this property
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
