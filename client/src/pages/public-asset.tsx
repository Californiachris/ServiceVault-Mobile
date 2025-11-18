import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Shield, 
  Wrench,
  FileText,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Star 
} from "lucide-react";
import { format } from "date-fns";

interface ContractorBranding {
  companyName: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface PublicAssetData {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serial?: string;
  installedAt?: string;
  status: string;
  warrantyUntil?: string;
  nextMaintenance?: string;
  contractorBranding?: ContractorBranding | null;
  events: Array<{
    id: string;
    type: string;
    data: any;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    type: string;
    uploadedAt: string;
  }>;
  reminders: Array<{
    title: string;
    dueAt: string;
    status: string;
  }>;
}

export default function PublicAsset() {
  const [, params] = useRoute("/asset/:assetId");
  const assetId = params?.assetId;

  const { data: asset, isLoading, error } = useQuery<PublicAssetData>({
    queryKey: ["/api/public/asset", assetId],
    enabled: !!assetId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Asset Not Found</h2>
            <p className="text-muted-foreground">
              This asset could not be found or is not publicly accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contractorBranding } = asset;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* HERO: Contractor Branding Banner - Permanent Marketing */}
      {contractorBranding && (
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 border-b-4 border-primary/30" data-testid="section-contractor-hero">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              {contractorBranding.logoUrl && (
                <div className="shrink-0">
                  <img 
                    src={contractorBranding.logoUrl} 
                    alt={contractorBranding.companyName}
                    className="h-20 w-20 object-contain rounded-xl bg-white p-3 shadow-lg"
                    data-testid="img-contractor-logo"
                  />
                </div>
              )}
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wide">Professional Installation</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" data-testid="text-contractor-name">
                  {contractorBranding.companyName}
                </h1>
                <p className="text-white/90 text-sm sm:text-base">
                  {asset.category 
                    ? `Installed and serviced this ${asset.category.toLowerCase()} asset` 
                    : 'Professional installation by your trusted contractor'}
                </p>
              </div>
            </div>

            {/* Contact Buttons - Hero Level */}
            {(contractorBranding.phone || contractorBranding.email || contractorBranding.website) ? (
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                {contractorBranding.phone && (
                  <Button 
                    size="lg"
                    className="flex-1 gap-2 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg min-w-[200px]" 
                    asChild
                    data-testid="button-call-contractor"
                  >
                    <a href={`tel:${contractorBranding.phone}`}>
                      <Phone className="h-5 w-5" />
                      Call Now
                    </a>
                  </Button>
                )}
                {contractorBranding.email && (
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="flex-1 gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20 font-semibold min-w-[200px]" 
                    asChild
                    data-testid="button-email-contractor"
                  >
                    <a href={`mailto:${contractorBranding.email}`}>
                      <Mail className="h-5 w-5" />
                      Email
                    </a>
                  </Button>
                )}
                {contractorBranding.website && (
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="flex-1 gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20 font-semibold min-w-[200px]" 
                    asChild
                    data-testid="button-visit-website"
                  >
                    <a href={contractorBranding.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-5 w-5" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center p-4 bg-white/10 rounded-lg">
                <p className="text-white/90 text-sm">
                  This asset was professionally installed by {contractorBranding.companyName}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/80">
              <CheckCircle2 className="h-4 w-4" />
              <span>Verified installer • Automatic maintenance reminders • Professional support</span>
            </div>
          </div>
        </div>
      )}

      {/* Asset Information */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Asset Details Card */}
        <Card data-testid="card-asset-details">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2" data-testid="text-asset-name">{asset.name}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" data-testid="badge-category">{asset.category}</Badge>
                  {asset.status && (
                    <Badge 
                      variant={asset.status === 'ACTIVE' ? 'default' : 'outline'}
                      className={asset.status === 'ACTIVE' ? 'bg-green-500' : ''}
                      data-testid="badge-status"
                    >
                      {asset.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(asset.brand || asset.model || asset.serial) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {asset.brand && (
                  <div>
                    <p className="text-muted-foreground mb-1">Brand</p>
                    <p className="font-medium" data-testid="text-brand">{asset.brand}</p>
                  </div>
                )}
                {asset.model && (
                  <div>
                    <p className="text-muted-foreground mb-1">Model</p>
                    <p className="font-medium" data-testid="text-model">{asset.model}</p>
                  </div>
                )}
                {asset.serial && (
                  <div>
                    <p className="text-muted-foreground mb-1">Serial Number</p>
                    <p className="font-mono text-xs" data-testid="text-serial">{asset.serial}</p>
                  </div>
                )}
              </div>
            )}

            {(asset.installedAt || asset.warrantyUntil || asset.nextMaintenance) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {asset.installedAt && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground mb-1">Installed</p>
                        <p className="font-medium" data-testid="text-installed-date">
                          {format(new Date(asset.installedAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {asset.warrantyUntil && (
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground mb-1">Warranty Until</p>
                        <p className="font-medium" data-testid="text-warranty-until">
                          {format(new Date(asset.warrantyUntil), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {asset.nextMaintenance && (
                    <div className="flex items-start gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground mb-1">Next Maintenance</p>
                        <p className="font-medium" data-testid="text-next-maintenance">
                          {format(new Date(asset.nextMaintenance), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Service History */}
        {asset.events.length > 0 && (
          <Card data-testid="card-service-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {asset.events.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-3" data-testid={`event-${index}`}>
                    <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {event.data?.note && (
                        <p className="text-sm text-muted-foreground">{event.data.note}</p>
                      )}
                      {event.data?.installerName && event.type === "INSTALL" && (
                        <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                          <p className="text-sm font-medium" data-testid={`text-installer-name-${index}`}>
                            Installed by: {event.data.installerName}
                          </p>
                          {event.data.installerCompany && (
                            <p className="text-xs text-muted-foreground" data-testid={`text-installer-company-${index}`}>
                              {event.data.installerCompany}
                            </p>
                          )}
                          {event.data.installerPhone && (
                            <p className="text-xs text-muted-foreground" data-testid={`text-installer-phone-${index}`}>
                              📞 {event.data.installerPhone}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {asset.documents.length > 0 && (
          <Card data-testid="card-documents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {asset.documents.map((doc, index) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`document-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Reminders */}
        {asset.reminders.length > 0 && (
          <Card data-testid="card-reminders">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Upcoming Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {asset.reminders.map((reminder, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`reminder-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{reminder.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{format(new Date(reminder.dueAt), 'MMM dd, yyyy')}</p>
                      <Badge variant="outline" className="text-xs mt-1">{reminder.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sticky Contact CTA - Bottom */}
        {contractorBranding && (
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 -mx-6 px-6">
            <Card className="border-2 border-primary/30 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {contractorBranding.logoUrl && (
                      <img 
                        src={contractorBranding.logoUrl} 
                        alt={contractorBranding.companyName}
                        className="h-10 w-10 object-contain rounded bg-muted p-1"
                      />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Need service?</p>
                      <p className="font-semibold">{contractorBranding.companyName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {contractorBranding.phone && (
                      <Button size="sm" asChild data-testid="button-call-sticky">
                        <a href={`tel:${contractorBranding.phone}`}>
                          <Phone className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Call</span>
                        </a>
                      </Button>
                    )}
                    {contractorBranding.email && (
                      <Button size="sm" variant="outline" asChild data-testid="button-email-sticky">
                        <a href={`mailto:${contractorBranding.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Powered by ServiceVault */}
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">ServiceVault™</span> - Premium Asset Tracking
          </p>
        </div>
      </div>
    </div>
  );
}
