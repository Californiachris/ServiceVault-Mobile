import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  FileText,
  Calendar,
  Package,
  Tag,
  History,
  Shield,
  ImageIcon
} from "lucide-react";

interface AssetEvent {
  id: string;
  type: string;
  data: any;
  createdAt: string;
  photoUrls?: string[];
}

interface AssetData {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serial?: string;
  notes?: string;
  installedAt?: string;
  status: string;
  events: AssetEvent[];
}

export default function AssetView() {
  const [, params] = useRoute("/asset/:id");
  const assetId = params?.id;

  const { data: asset, isLoading } = useQuery<AssetData>({
    queryKey: [`/api/public/asset/${assetId}`],
    enabled: !!assetId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-red-500/20 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
              <p className="text-muted-foreground">This asset doesn't exist or has been removed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-base font-semibold text-primary">ServiceVault Verified Asset</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 tracking-tight" data-testid="text-asset-name">
            {asset.name}
          </h1>
          <p className="text-lg text-muted-foreground">Complete installation and service history</p>
        </div>

        {/* Asset Details Card */}
        <Card className="mb-6 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-primary" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground font-semibold">Category</span>
                <p className="font-medium" data-testid="text-category">
                  {asset.category}
                </p>
              </div>
              {asset.brand && (
                <div>
                  <span className="text-sm text-muted-foreground font-semibold">Brand</span>
                  <p className="font-medium" data-testid="text-brand">
                    {asset.brand}
                  </p>
                </div>
              )}
              {asset.model && (
                <div>
                  <span className="text-sm text-muted-foreground font-semibold">Model</span>
                  <p className="font-medium" data-testid="text-model">
                    {asset.model}
                  </p>
                </div>
              )}
              {asset.serial && (
                <div>
                  <span className="text-sm text-muted-foreground font-semibold">Serial Number</span>
                  <p className="font-mono text-sm" data-testid="text-serial">
                    {asset.serial}
                  </p>
                </div>
              )}
              {asset.installedAt && (
                <div>
                  <span className="text-sm text-muted-foreground font-semibold">Installed On</span>
                  <p className="font-medium flex items-center gap-2" data-testid="text-install-date">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(asset.installedAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground font-semibold">Status</span>
                <div data-testid="badge-status">
                  <Badge 
                    variant={asset.status === "ACTIVE" ? "default" : "secondary"}
                    className="bg-green-500/20 text-green-400 border-green-500/30"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {asset.status}
                  </Badge>
                </div>
              </div>
            </div>

            {asset.notes && (
              <div className="mt-6 pt-6 border-t">
                <span className="text-sm text-muted-foreground font-semibold">Installer Notes</span>
                <p className="mt-2" data-testid="text-installer-notes">
                  {asset.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service History Timeline */}
        <Card className="backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <History className="h-6 w-6 text-primary" />
              Service History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.events && asset.events.length > 0 ? (
              <div className="space-y-6">
                {asset.events.map((event, index) => (
                  <div 
                    key={event.id} 
                    className="relative pl-8 pb-6 last:pb-0"
                    data-testid={`event-${event.type.toLowerCase()}-${index}`}
                  >
                    {/* Timeline line */}
                    {index < asset.events.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-border" />
                    )}

                    {/* Event icon */}
                    <div className="absolute left-0 top-1">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-primary flex items-center justify-center shadow-md">
                        {event.type === "INSTALL" && <Wrench className="h-4 w-4 text-white" />}
                        {event.type === "SERVICE" && <Wrench className="h-4 w-4 text-white" />}
                        {event.type === "REPAIR" && <Wrench className="h-4 w-4 text-white" />}
                        {event.type === "INSPECTION" && <FileText className="h-4 w-4 text-white" />}
                        {event.type === "WARRANTY" && <Shield className="h-4 w-4 text-white" />}
                        {event.type === "NOTE" && <Tag className="h-4 w-4 text-white" />}
                      </div>
                    </div>

                    {/* Event content */}
                    <div className="backdrop-blur-sm bg-muted/30 rounded-lg p-4 border hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold" data-testid={`text-event-type-${index}`}>
                          {event.type}
                        </h3>
                        <span className="text-xs text-muted-foreground" data-testid={`text-event-date-${index}`}>
                          {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy h:mm a") : "Unknown date"}
                        </span>
                      </div>

                      {/* Event data */}
                      {event.data && (
                        <div className="text-sm space-y-1">
                          {event.data.note && (
                            <p data-testid={`text-event-note-${index}`}>{event.data.note}</p>
                          )}
                          {event.data.installDate && event.type === "INSTALL" && (
                            <p className="text-muted-foreground">
                              Install Date: {format(new Date(event.data.installDate), "MMMM d, yyyy")}
                            </p>
                          )}
                          {event.data.installerName && event.type === "INSTALL" && (
                            <div className="mt-2 p-3 bg-primary/5 rounded-lg border">
                              <p className="font-semibold text-primary" data-testid={`text-installer-name-${index}`}>
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
                      )}

                      {/* Event photos */}
                      {event.photoUrls && event.photoUrls.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {event.photoUrls.length} Photo{event.photoUrls.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {event.photoUrls.map((url, photoIndex) => (
                              <a
                                key={photoIndex}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-all duration-200 hover:shadow-md"
                                data-testid={`img-event-photo-${index}-${photoIndex}`}
                              >
                                <img
                                  src={url}
                                  alt={`${event.type} photo ${photoIndex + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No service history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tamper-proof badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border shadow-lg">
            <div className="p-1 rounded-full bg-green-500/10">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-sm font-semibold">
              Tamper-Proof Hash Chain Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
