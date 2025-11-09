import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DocumentScanner } from "@/components/DocumentScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ClaimAssetFormData {
  code: string;
  assetName: string;
  assetCategory: string;
  assetBrand: string;
  assetModel: string;
  assetSerial: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
}

const ASSET_CATEGORIES = [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 
  'FURNITURE', 'STRUCTURAL', 'VEHICLE', 'HEAVY_EQUIPMENT', 'OTHER'
];

export default function AssetClaimToolView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [claimForm, setClaimForm] = useState<ClaimAssetFormData>({
    code: '',
    assetName: '',
    assetCategory: 'OTHER',
    assetBrand: '',
    assetModel: '',
    assetSerial: '',
    propertyName: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
  });

  const claimMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/identifiers/claim", {
        code: data.code,
        asset: {
          name: data.assetName,
          category: data.assetCategory,
          brand: data.assetBrand || undefined,
          model: data.assetModel || undefined,
          serial: data.assetSerial || undefined,
        },
        property: {
          name: data.propertyName,
          addressLine1: data.propertyAddress || undefined,
          city: data.propertyCity || undefined,
          state: data.propertyState || undefined,
          postalCode: data.propertyZip || undefined,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Claimed Successfully",
        description: `${claimForm.assetName} has been bound to ${claimForm.propertyName}`,
      });
      setClaimForm({
        code: '', assetName: '', assetCategory: 'OTHER', assetBrand: '', assetModel: '', assetSerial: '',
        propertyName: '', propertyAddress: '', propertyCity: '', propertyState: '', propertyZip: '',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
        title: "Claim Failed",
        description: error.message || "Failed to claim asset",
        variant: "destructive",
      });
    },
  });

  const handleAIDataExtracted = (data: any) => {
    setClaimForm(prev => ({
      ...prev,
      assetName: data.assetName || prev.assetName,
      assetBrand: data.assetBrand || prev.assetBrand,
      assetModel: data.assetModel || prev.assetModel,
      assetSerial: data.assetSerial || prev.assetSerial,
      assetCategory: data.assetCategory || prev.assetCategory,
    }));
    toast({
      title: "Data Extracted!",
      description: "Please review the auto-filled information below and complete any remaining fields.",
    });
    setShowManualEntry(true);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.code || !claimForm.assetName || !claimForm.propertyName) {
      toast({
        title: "Missing Information",
        description: "Please fill in the code, asset name, and property name",
        variant: "destructive",
      });
      return;
    }
    claimMutation.mutate(claimForm);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <p className="font-semibold">AI-Powered Asset Registration</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Scan a warranty or receipt to automatically extract asset details
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DocumentScanner 
            onDataExtracted={handleAIDataExtracted}
            extractionType="asset"
          />
        </CardContent>
      </Card>

      <Collapsible open={showManualEntry} onOpenChange={setShowManualEntry}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full" 
            data-testid="button-toggle-manual-entry"
          >
            {showManualEntry ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Manual Entry
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Enter Manually Instead
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-6">
          <form onSubmit={handleClaimSubmit} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">QR Code *</Label>
                    <Input
                      id="code"
                      placeholder="e.g., FT-HVAC-2024-A7K9"
                      value={claimForm.code}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, code: e.target.value }))}
                      required
                      data-testid="input-claim-code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetName">Asset Name *</Label>
                    <Input
                      id="assetName"
                      placeholder="e.g., Water Heater"
                      value={claimForm.assetName}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, assetName: e.target.value }))}
                      required
                      data-testid="input-asset-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetCategory">Category</Label>
                    <Select 
                      value={claimForm.assetCategory} 
                      onValueChange={(value) => setClaimForm(prev => ({ ...prev, assetCategory: value }))}
                    >
                      <SelectTrigger data-testid="select-asset-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetBrand">Brand</Label>
                    <Input
                      id="assetBrand"
                      placeholder="e.g., Rheem"
                      value={claimForm.assetBrand}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, assetBrand: e.target.value }))}
                      data-testid="input-asset-brand"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetModel">Model</Label>
                    <Input
                      id="assetModel"
                      placeholder="e.g., XR16"
                      value={claimForm.assetModel}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, assetModel: e.target.value }))}
                      data-testid="input-asset-model"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetSerial">Serial Number</Label>
                    <Input
                      id="assetSerial"
                      placeholder="e.g., ABC123456"
                      value={claimForm.assetSerial}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, assetSerial: e.target.value }))}
                      data-testid="input-asset-serial"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <h4 className="font-semibold">Property Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyName">Property Name *</Label>
                    <Input
                      id="propertyName"
                      placeholder="e.g., Main Residence"
                      value={claimForm.propertyName}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, propertyName: e.target.value }))}
                      required
                      data-testid="input-property-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyAddress">Address</Label>
                    <Input
                      id="propertyAddress"
                      placeholder="e.g., 123 Main Street"
                      value={claimForm.propertyAddress}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, propertyAddress: e.target.value }))}
                      data-testid="input-property-address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyCity">City</Label>
                    <Input
                      id="propertyCity"
                      placeholder="e.g., Anytown"
                      value={claimForm.propertyCity}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, propertyCity: e.target.value }))}
                      data-testid="input-property-city"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyState">State</Label>
                    <Input
                      id="propertyState"
                      placeholder="e.g., CA"
                      value={claimForm.propertyState}
                      onChange={(e) => setClaimForm(prev => ({ ...prev, propertyState: e.target.value }))}
                      data-testid="input-property-state"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full"
              disabled={claimMutation.isPending}
              data-testid="button-submit-claim"
            >
              {claimMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Claiming Asset...
                </>
              ) : (
                'Claim Asset'
              )}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
