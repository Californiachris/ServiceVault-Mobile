import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import AssetCard from "@/components/ui/asset-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Home, Plus, Search, Filter, QrCode } from "lucide-react";

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

export default function AssetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
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

  // Check URL for code parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setClaimForm(prev => ({ ...prev, code }));
      setShowClaimDialog(true);
    }
  }, []);

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/assets", selectedProperty],
    enabled: isAuthenticated && !!selectedProperty,
    retry: false,
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
    onSuccess: (data) => {
      toast({
        title: "Asset Claimed Successfully",
        description: `${claimForm.assetName} has been bound to ${claimForm.propertyName}`,
      });
      setShowClaimDialog(false);
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

  const filteredAssets = (Array.isArray(assets) ? assets : []).filter((asset: any) => {
    const matchesSearch = searchTerm === '' || 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || asset.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Asset Management</h1>
            <p className="text-muted-foreground">
              Manage your properties, assets, and their complete history in one place.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowClaimDialog(true)}
              data-testid="button-claim-asset"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Claim Asset
            </Button>
            <Button 
              onClick={() => setShowClaimDialog(true)}
              data-testid="button-add-asset"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList>
            <TabsTrigger value="properties" data-testid="tab-properties">
              <Home className="mr-2 h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="tab-assets">
              <Wrench className="mr-2 h-4 w-4" />
              Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-6">
            {/* Property Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Property</CardTitle>
              </CardHeader>
              <CardContent>
                {propertiesLoading ? (
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                ) : properties && Array.isArray(properties) && properties.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map((property: any) => (
                      <Card 
                        key={property.id}
                        className={`cursor-pointer transition-colors hover:border-primary/50 ${
                          selectedProperty === property.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedProperty(property.id)}
                        data-testid={`property-card-${property.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{property.name || 'Unnamed Property'}</h3>
                            {property.homeStatus && (
                              <Badge variant="outline" className="text-xs">
                                {property.homeStatus}
                              </Badge>
                            )}
                          </div>
                          
                          {property.addressLine1 && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {property.addressLine1}
                              {property.city && `, ${property.city}`}
                              {property.state && ` ${property.state}`}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Plan: {property.homePlan || 'None'}</span>
                            {property.masterIdentifierId && (
                              <Badge variant="outline" className="text-xs">
                                Master Code Set
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first property by claiming an asset or master code.
                    </p>
                    <Button 
                      onClick={() => setShowClaimDialog(true)}
                      data-testid="button-create-first-property"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Claim Your First Asset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            {selectedProperty ? (
              <>
                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search assets by name, brand, or model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            data-testid="input-search-assets"
                          />
                        </div>
                      </div>
                      
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Categories</SelectItem>
                          {ASSET_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Assets Grid */}
                {assetsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredAssets.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map((asset: any) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        onEdit={() => {
                          toast({
                            title: "Edit Asset",
                            description: "Asset editing functionality coming soon",
                          });
                        }}
                        onViewHistory={() => {
                          toast({
                            title: "View History",
                            description: "Asset history view coming soon",
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm || categoryFilter !== 'ALL' 
                            ? 'No assets match your current filters' 
                            : 'This property has no assets yet'
                          }
                        </p>
                        <Button 
                          onClick={() => setShowClaimDialog(true)}
                          data-testid="button-add-first-asset"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Asset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select a Property</h3>
                    <p className="text-muted-foreground">
                      Choose a property from the Properties tab to view and manage its assets.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Asset Dialog - Simplified */}
        <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Asset</DialogTitle>
              <DialogDescription>
                Track a new asset in your property
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleClaimSubmit} className="space-y-6">
              {/* Scan QR Button - Primary Action */}
              <div className="space-y-3">
                <Button 
                  type="button"
                  size="lg"
                  className="w-full h-16 text-lg"
                  onClick={() => {
                    setShowClaimDialog(false);
                    window.location.href = '/scan';
                  }}
                  data-testid="button-scan-qr-asset"
                >
                  <QrCode className="mr-3 h-6 w-6" />
                  Scan Asset QR Code
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Recommended - Fastest way to add an asset
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              {/* Simplified 3-Field Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-base">QR Code (optional)</Label>
                  <Input
                    id="code"
                    placeholder="Scan or enter code"
                    value={claimForm.code}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, code: e.target.value }))}
                    className="h-12 text-base"
                    data-testid="input-claim-code"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank if you don't have a QR sticker</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetName" className="text-base">What is it? *</Label>
                  <Input
                    id="assetName"
                    placeholder="e.g., Water Heater, HVAC Unit"
                    value={claimForm.assetName}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, assetName: e.target.value }))}
                    required
                    className="h-12 text-base"
                    data-testid="input-asset-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyName" className="text-base">Where is it? *</Label>
                  <Input
                    id="propertyName"
                    placeholder="e.g., Main House, Rental Property"
                    value={claimForm.propertyName}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, propertyName: e.target.value }))}
                    required
                    className="h-12 text-base"
                    data-testid="input-property-name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={claimMutation.isPending}
                  className="w-full h-12"
                  data-testid="button-submit-claim"
                >
                  {claimMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Add Asset'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg"
                  onClick={() => setShowClaimDialog(false)}
                  className="w-full h-12"
                  data-testid="button-cancel-claim"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
