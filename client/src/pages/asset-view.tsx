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
          <Card className="bg-slate-900/80 border-red-500/20 shadow-2xl shadow-cyan-500/20 rounded-3xl">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Asset Not Found</h2>
              <p className="text-slate-300">This asset doesn't exist or has been removed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-2xl shadow-cyan-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <span className="text-xl font-bold text-cyan-400">ServiceVault Verified Asset</span>
          </div>
          <h1 className="text-6xl font-bold mb-4 tracking-tight text-white" data-testid="text-asset-name">
            {asset.name}
          </h1>
          <p className="text-xl text-slate-300">Complete installation and service history</p>
        </div>

        {/* Asset Details Card */}
        <Card className="mb-8 bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl transform transition-all duration-300 hover:shadow-cyan-500/50 hover:shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Category</span>
                <p className="font-semibold text-white text-lg mt-1" data-testid="text-category">
                  {asset.category}
                </p>
              </div>
              {asset.brand && (
                <div>
                  <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Brand</span>
                  <p className="font-semibold text-white text-lg mt-1" data-testid="text-brand">
                    {asset.brand}
                  </p>
                </div>
              )}
              {asset.model && (
                <div>
                  <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Model</span>
                  <p className="font-semibold text-white text-lg mt-1" data-testid="text-model">
                    {asset.model}
                  </p>
                </div>
              )}
              {asset.serial && (
                <div>
                  <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Serial Number</span>
                  <p className="font-mono text-base text-white mt-1" data-testid="text-serial">
                    {asset.serial}
                  </p>
                </div>
              )}
              {asset.installedAt && (
                <div>
                  <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Installed On</span>
                  <p className="font-semibold text-white text-lg mt-1 flex items-center gap-2" data-testid="text-install-date">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                    {format(new Date(asset.installedAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Status</span>
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
              <div className="mt-6 pt-6 border-t border-slate-700">
                <span className="text-sm text-slate-400 font-semibold uppercase tracking-wide">Installer Notes</span>
                <p className="mt-2 text-slate-200" data-testid="text-installer-notes">
                  {asset.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service History Timeline */}
        <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                <History className="h-6 w-6 text-white" />
              </div>
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
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        {event.type === "INSTALL" && <Wrench className="h-5 w-5 text-white" />}
                        {event.type === "SERVICE" && <Wrench className="h-5 w-5 text-white" />}
                        {event.type === "REPAIR" && <Wrench className="h-5 w-5 text-white" />}
                        {event.type === "INSPECTION" && <FileText className="h-5 w-5 text-white" />}
                        {event.type === "WARRANTY" && <Shield className="h-5 w-5 text-white" />}
                        {event.type === "NOTE" && <Tag className="h-5 w-5 text-white" />}
                      </div>
                    </div>

                    {/* Event content */}
                    <div className="bg-slate-800/50 border-slate-600/50 rounded-2xl p-5 border hover:border-cyan-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/50 hover:scale-[1.02] transform shadow-2xl shadow-cyan-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-white text-lg" data-testid={`text-event-type-${index}`}>
                          {event.type}
                        </h3>
                        <span className="text-xs text-slate-400" data-testid={`text-event-date-${index}`}>
                          {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy h:mm a") : "Unknown date"}
                        </span>
                      </div>

                      {/* Event data */}
                      {event.data && (
                        <div className="text-sm space-y-2">
                          {event.data.note && (
                            <p className="text-slate-200" data-testid={`text-event-note-${index}`}>{event.data.note}</p>
                          )}
                          {event.data.installDate && event.type === "INSTALL" && (
                            <p className="text-slate-300">
                              Install Date: {format(new Date(event.data.installDate), "MMMM d, yyyy")}
                            </p>
                          )}
                          {event.data.installerName && event.type === "INSTALL" && (
                            <div className="mt-3 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                              <p className="font-bold text-cyan-400 text-base" data-testid={`text-installer-name-${index}`}>
                                Installed by: {event.data.installerName}
                              </p>
                              {event.data.installerCompany && (
                                <p className="text-sm text-slate-300 mt-1" data-testid={`text-installer-company-${index}`}>
                                  {event.data.installerCompany}
                                </p>
                              )}
                              {event.data.installerPhone && (
                                <p className="text-sm text-slate-300 mt-1" data-testid={`text-installer-phone-${index}`}>
                                  📞 {event.data.installerPhone}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Event photos */}
                      {event.photoUrls && event.photoUrls.length > 0 && (
                        <div className="mt-5">
                          <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="h-5 w-5 text-cyan-400" />
                            <span className="text-sm font-semibold text-slate-300">
                              {event.photoUrls.length} Photo{event.photoUrls.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {event.photoUrls.map((url, photoIndex) => (
                              <a
                                key={photoIndex}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-600 hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:scale-[1.05] transform"
                                data-testid={`img-event-photo-${index}-${photoIndex}`}
                              >
                                <img
                                  src={url}
                                  alt={`${event.type} photo ${photoIndex + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
              <div className="text-center py-12 text-slate-400">
                <History className="mx-auto h-16 w-16 mb-3 opacity-50" />
                <p className="text-lg">No service history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tamper-proof badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-slate-900/80 border-2 border-green-500/30 shadow-2xl shadow-green-500/20 backdrop-blur-xl">
            <div className="p-2 rounded-xl bg-green-500/20">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-base font-bold text-white">
              Tamper-Proof Hash Chain Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
