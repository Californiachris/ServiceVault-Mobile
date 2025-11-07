import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  MapPin, 
  Shield, 
  Calendar, 
  Upload,
  Eye,
  Building2,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";

export default function PropertyViewPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Use authenticated endpoint if logged in (to see PERSONAL assets if owner)
  // Otherwise use public endpoint (to see INFRASTRUCTURE only)
  const endpoint = isAuthenticated ? `/api/property/${id}` : `/api/public/property/${id}`;
  
  const { data: property, isLoading } = useQuery<{
    id: string;
    name: string | null;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
    } | null;
    familyBranding: {
      familyName: string;
      familyLogoUrl: string;
    } | null;
    isOwner?: boolean;
    assets: Array<{
      id: string;
      name: string;
      category: string;
      brand: string | null;
      model: string | null;
      installedAt: string | null;
      status: string;
      assetType?: string;
    }>;
  }>({
    queryKey: [endpoint],
    retry: false,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The property you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-go-home">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              {property.familyBranding && (
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={property.familyBranding.familyLogoUrl} 
                    alt={property.familyBranding.familyName}
                    className="h-12 w-12 object-contain rounded-lg"
                    data-testid="img-family-logo"
                  />
                  <div>
                    <h1 className="text-3xl font-bold" data-testid="text-family-name">
                      {property.familyBranding.familyName}
                    </h1>
                    <Badge variant="secondary" className="mt-1">
                      <Shield className="mr-1 h-3 w-3" />
                      FixTrack Protected
                    </Badge>
                  </div>
                </div>
              )}
              
              {!property.familyBranding && (
                <div className="flex items-center gap-3 mb-2">
                  <Home className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold" data-testid="text-property-name">
                    {property.name || "Property"}
                  </h1>
                </div>
              )}
              
              {property.address && (
                <div className="flex items-center gap-2 text-muted-foreground" data-testid="text-property-address">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property.address.line1}, {property.address.city}, {property.address.state} {property.address.postalCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">
                      {property.isOwner ? "Your Property Assets" : "Property Infrastructure History"}
                    </h3>
                    {property.isOwner && (
                      <Badge variant="default" data-testid="badge-owner-view">
                        <Eye className="mr-1 h-3 w-3" />
                        Owner View
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {property.isOwner 
                      ? "You can see all assets for this property, including personal items. Infrastructure assets are visible to the public."
                      : "This page shows all infrastructure installations and service records for this property. Click any asset to view its complete tamper-proof timeline."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assets Grid */}
        {property.assets.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {property.assets.map((asset) => (
              <Card 
                key={asset.id} 
                className="hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setLocation(`/asset/${asset.id}`)}
                data-testid={`card-asset-${asset.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <span className="truncate" data-testid={`text-asset-name-${asset.id}`}>
                      {asset.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <Badge variant="outline" data-testid={`badge-category-${asset.id}`}>
                        {asset.category.replace('_', ' ')}
                      </Badge>
                    </div>

                    {property.isOwner && asset.assetType && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Visibility</span>
                        <Badge 
                          variant={asset.assetType === 'INFRASTRUCTURE' ? 'default' : 'secondary'}
                          data-testid={`badge-asset-type-${asset.id}`}
                        >
                          {asset.assetType === 'INFRASTRUCTURE' ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                    )}

                    {asset.brand && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Brand</span>
                        <span className="font-medium" data-testid={`text-brand-${asset.id}`}>
                          {asset.brand}
                        </span>
                      </div>
                    )}

                    {asset.model && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium" data-testid={`text-model-${asset.id}`}>
                          {asset.model}
                        </span>
                      </div>
                    )}

                    {asset.installedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Installed</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span data-testid={`text-installed-${asset.id}`}>
                            {format(new Date(asset.installedAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/asset/${asset.id}`);
                        }}
                        data-testid={`button-view-asset-${asset.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Full History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Infrastructure Assets</h3>
                <p className="text-muted-foreground">
                  No infrastructure installations have been logged for this property yet.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
