import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Clock, CheckCircle2, User, Calendar, Filter, RefreshCw } from "lucide-react";
import { format, formatDuration, intervalToDuration } from "date-fns";

interface Visit {
  visit: {
    id: string;
    checkInAt: string;
    checkOutAt: string | null;
    status: string;
    checkInMethod: string | null;
    checkOutMethod: string | null;
    checkInLatitude: string | null;
    checkInLongitude: string | null;
    checkOutLatitude: string | null;
    checkOutLongitude: string | null;
    tasksCompleted: number;
    notes: string | null;
  };
  property: any;
  worker: any;
}

export default function Visits() {
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["/api/property-manager/visits/paginated", limit, offset],
  });

  useEffect(() => {
    if (paginatedData?.visits) {
      if (offset === 0) {
        setAllVisits(paginatedData.visits);
      } else {
        setAllVisits(prev => [...prev, ...paginatedData.visits]);
      }
    }
  }, [paginatedData, offset]);

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/property-manager/properties"],
  });

  const { data: workers } = useQuery<any[]>({
    queryKey: ["/api/property-manager/workers"],
  });

  const filteredVisits = allVisits?.filter((v) => {
    if (propertyFilter !== "all" && v.property.id !== propertyFilter) return false;
    if (workerFilter !== "all" && v.worker.id !== workerFilter) return false;
    return true;
  });

  const getVisitDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "In progress";
    const duration = intervalToDuration({
      start: new Date(checkIn),
      end: new Date(checkOut),
    });
    return formatDuration(duration, { format: ["hours", "minutes"] });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="heading-visits">
            Worker Visits
          </h1>
          <p className="text-muted-foreground mb-6">
            Track worker check-ins and check-outs at your properties
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-60" data-testid="select-property-filter">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.property?.name || p.property?.addressLine1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-60" data-testid="select-worker-filter">
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} - {w.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Visits Timeline */}
      {!filteredVisits || filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No visits found</h3>
            <p className="text-muted-foreground">
              {propertyFilter !== "all" || workerFilter !== "all"
                ? "No visits match your filters"
                : "Worker visits will appear here when they check in to properties"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredVisits.map((visit) => (
            <Card key={visit.visit.id} data-testid={`visit-card-${visit.visit.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Visit Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{visit.worker.name}</h3>
                            <p className="text-sm text-muted-foreground">{visit.worker.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{visit.property?.property?.name || "Property"}</span>
                        </div>
                      </div>
                      <Badge
                        variant={visit.visit.status === "COMPLETED" ? "default" : "secondary"}
                        className={visit.visit.status === "IN_PROGRESS" ? "bg-green-500" : ""}
                      >
                        {visit.visit.status}
                      </Badge>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span>Check In</span>
                        </div>
                        <div className="font-semibold">
                          {format(new Date(visit.visit.checkInAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        {visit.visit.checkInMethod && (
                          <div className="text-xs text-muted-foreground mt-1">
                            via {visit.visit.checkInMethod}
                          </div>
                        )}
                        {visit.visit.checkInLatitude && visit.visit.checkInLongitude && (
                          <div className="text-xs text-muted-foreground">
                            GPS: {parseFloat(visit.visit.checkInLatitude).toFixed(4)}, {parseFloat(visit.visit.checkInLongitude).toFixed(4)}
                          </div>
                        )}
                      </div>
                      {visit.visit.checkOutAt && (
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Check Out</span>
                          </div>
                          <div className="font-semibold">
                            {format(new Date(visit.visit.checkOutAt), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          {visit.visit.checkOutMethod && (
                            <div className="text-xs text-muted-foreground mt-1">
                              via {visit.visit.checkOutMethod}
                            </div>
                          )}
                          {visit.visit.checkOutLatitude && visit.visit.checkOutLongitude && (
                            <div className="text-xs text-muted-foreground">
                              GPS: {parseFloat(visit.visit.checkOutLatitude).toFixed(4)}, {parseFloat(visit.visit.checkOutLongitude).toFixed(4)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Duration: {getVisitDuration(visit.visit.checkInAt, visit.visit.checkOutAt)}
                        </span>
                      </div>
                      {visit.visit.tasksCompleted > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{visit.visit.tasksCompleted} tasks completed</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {visit.visit.notes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{visit.visit.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {paginatedData?.pagination?.hasMore && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => setOffset(prev => prev + limit)} 
            disabled={isLoading}
            data-testid="button-load-more-visits"
            variant="outline"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More ({paginatedData.pagination.total - allVisits.length} remaining)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
