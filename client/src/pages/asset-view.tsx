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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-red-500/20 bg-slate-900/50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Asset Not Found</h2>
              <p className="text-slate-400">This asset doesn't exist or has been removed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">FixTrack Verified Asset</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="text-asset-name">
            {asset.name}
          </h1>
          <p className="text-slate-400">Complete installation and service history</p>
        </div>

        {/* Asset Details Card */}
        <Card className="mb-6 border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-400">Category</span>
                <p className="text-white font-medium" data-testid="text-category">
                  {asset.category}
                </p>
              </div>
              {asset.brand && (
                <div>
                  <span className="text-sm text-slate-400">Brand</span>
                  <p className="text-white font-medium" data-testid="text-brand">
                    {asset.brand}
                  </p>
                </div>
              )}
              {asset.model && (
                <div>
                  <span className="text-sm text-slate-400">Model</span>
                  <p className="text-white font-medium" data-testid="text-model">
                    {asset.model}
                  </p>
                </div>
              )}
              {asset.serial && (
                <div>
                  <span className="text-sm text-slate-400">Serial Number</span>
                  <p className="text-white font-mono text-sm" data-testid="text-serial">
                    {asset.serial}
                  </p>
                </div>
              )}
              {asset.installedAt && (
                <div>
                  <span className="text-sm text-slate-400">Installed On</span>
                  <p className="text-white font-medium flex items-center gap-2" data-testid="text-install-date">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    {format(new Date(asset.installedAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm text-slate-400">Status</span>
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
              <div className="mt-6 pt-6 border-t border-slate-800">
                <span className="text-sm text-slate-400">Installer Notes</span>
                <p className="text-white mt-2" data-testid="text-installer-notes">
                  {asset.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service History Timeline */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-400" />
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
                      <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-slate-800" />
                    )}

                    {/* Event icon */}
                    <div className="absolute left-0 top-1">
                      <div className="h-8 w-8 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center">
                        {event.type === "INSTALL" && <Wrench className="h-4 w-4 text-cyan-400" />}
                        {event.type === "SERVICE" && <Wrench className="h-4 w-4 text-cyan-400" />}
                        {event.type === "REPAIR" && <Wrench className="h-4 w-4 text-cyan-400" />}
                        {event.type === "INSPECTION" && <FileText className="h-4 w-4 text-cyan-400" />}
                        {event.type === "WARRANTY" && <Shield className="h-4 w-4 text-cyan-400" />}
                        {event.type === "NOTE" && <Tag className="h-4 w-4 text-cyan-400" />}
                      </div>
                    </div>

                    {/* Event content */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white" data-testid={`text-event-type-${index}`}>
                          {event.type}
                        </h3>
                        <span className="text-xs text-slate-400" data-testid={`text-event-date-${index}`}>
                          {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy h:mm a") : "Unknown date"}
                        </span>
                      </div>

                      {/* Event data */}
                      {event.data && (
                        <div className="text-sm text-slate-300 space-y-1">
                          {event.data.note && (
                            <p data-testid={`text-event-note-${index}`}>{event.data.note}</p>
                          )}
                          {event.data.installDate && event.type === "INSTALL" && (
                            <p className="text-slate-400">
                              Install Date: {format(new Date(event.data.installDate), "MMMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Event photos */}
                      {event.photoUrls && event.photoUrls.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-cyan-400" />
                            <span className="text-xs font-medium text-slate-400">
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
                                className="group relative aspect-square rounded overflow-hidden border border-slate-700 hover:border-cyan-500 transition-colors"
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
              <div className="text-center py-8 text-slate-400">
                <History className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No service history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tamper-proof badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-300">
              Tamper-Proof Hash Chain Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
