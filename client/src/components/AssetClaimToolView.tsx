import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ASSET_CATEGORIES } from "@/lib/constants";
import { DocumentScanner } from "@/components/DocumentScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Sparkles, Search, Package, Home, Calendar, Wrench } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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

export default function AssetClaimToolView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
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

  const filteredAssets = (Array.isArray(assets) ? assets : []).filter((asset: any) => {
    const matchesSearch = searchTerm === '' || 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || asset.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryDisplay = (category: string) => {
    const cat = ASSET_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category.replace('_', ' ');
  };

  const getCategoryIcon = (category: string) => {
    const cat = ASSET_CATEGORIES.find(c => c.value === category);
    if (cat && cat.icon) {
      const Icon = cat.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="claim" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-asset-claim">
          <TabsTrigger value="my-assets" data-testid="tab-my-assets">
            <Package className="mr-2 h-4 w-4" />
            My Assets
          </TabsTrigger>
          <TabsTrigger value="claim" data-testid="tab-claim-new">
            <Sparkles className="mr-2 h-4 w-4" />
            Claim New Asset
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-assets" className="space-y-6 mt-6">
          {/* Property Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Property</CardTitle>
            </CardHeader>
            <CardContent>
              {propertiesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-properties" />
                </div>
              ) : properties && Array.isArray(properties) && properties.length > 0 ? (
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Choose a property to view its assets" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name || 'Unnamed Property'}
                        {property.addressLine1 && ` - ${property.addressLine1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-6">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No properties found. Claim your first asset to create a property.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedProperty && (
            <>
              {/* Search and Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, brand, or model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-assets"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setCategoryFilter('ALL')}
                        data-testid="filter-all"
                      >
                        All Categories
                      </Badge>
                      {ASSET_CATEGORIES.map((cat) => (
                        <Badge
                          key={cat.value}
                          variant={categoryFilter === cat.value ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setCategoryFilter(cat.value)}
                          data-testid={`filter-${cat.value.toLowerCase()}`}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assets Grid */}
              {assetsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-assets" />
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map((asset: any) => (
                    <Link key={asset.id} href={`/asset/${asset.id}`}>
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid={`asset-card-${asset.id}`}>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(asset.category)}
                              <h3 className="font-semibold" data-testid={`asset-name-${asset.id}`}>
                                {asset.name}
                              </h3>
                            </div>
                            <Badge variant="secondary" data-testid={`asset-category-${asset.id}`}>
                              {getCategoryDisplay(asset.category)}
                            </Badge>
                          </div>

                          {(asset.brand || asset.model) && (
                            <div className="text-sm text-muted-foreground">
                              {asset.brand && <span data-testid={`asset-brand-${asset.id}`}>{asset.brand}</span>}
                              {asset.brand && asset.model && ' · '}
                              {asset.model && <span data-testid={`asset-model-${asset.id}`}>{asset.model}</span>}
                            </div>
                          )}

                          {asset.serial && (
                            <div className="text-xs text-muted-foreground">
                              Serial: <span data-testid={`asset-serial-${asset.id}`}>{asset.serial}</span>
                            </div>
                          )}

                          {asset.installedAt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span data-testid={`asset-installed-${asset.id}`}>
                                Installed: {format(new Date(asset.installedAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={asset.status === 'ACTIVE' ? 'default' : 'secondary'}
                              data-testid={`asset-status-${asset.id}`}
                            >
                              {asset.status || 'ACTIVE'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || categoryFilter !== 'ALL'
                          ? 'No assets match your current filters'
                          : 'This property has no assets yet'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="claim" className="space-y-6 mt-6">
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
                            {ASSET_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
