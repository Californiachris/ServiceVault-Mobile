import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, Home, Wrench } from "lucide-react";
import { format } from "date-fns";

export default function PropertyHistory() {
  const [, params] = useRoute("/property/public/:masterQR");
  const masterQR = params?.masterQR;

  const { data: history, isLoading } = useQuery<any>({
    queryKey: ["/api/properties/public/history", masterQR],
    queryFn: async () => {
      const res = await fetch(`/api/properties/public/history/${masterQR}`);
      if (!res.ok) throw new Error("Failed to load property");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Property Not Found</h1>
          <p className="text-muted-foreground">This property may have been removed or the QR code is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Property Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl md:text-3xl mb-2">
                  {history.property.name || "Property History"}
                </CardTitle>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  {history.property.address}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {history.property.type || "Residential"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Property Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.timeline && history.timeline.length > 0 ? (
              <div className="space-y-4">
                {history.timeline.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                    data-testid={`timeline-item-${index}`}
                  >
                    <div className="flex-shrink-0">
                      {item.type === 'event' ? (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold">
                          {item.type === 'event' 
                            ? `${item.data.type}: ${item.data.assetName}`
                            : item.data.title || "Document"}
                        </h4>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      {item.data.description && (
                        <p className="text-sm text-muted-foreground">{item.data.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No history available for this property yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by ServiceVault</p>
        </div>
      </div>
    </div>
  );
}
