import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Filter, User, MapPin, Calendar, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface TenantReport {
  report: {
    id: string;
    title: string;
    description: string;
    issueType: string;
    severity: string;
    status: string;
    tenantName: string | null;
    tenantPhone: string | null;
    tenantEmail: string | null;
    reportedAt: string;
    resolvedAt: string | null;
    assignedTo: string | null;
  };
  property: any;
  worker: any | null;
}

export default function TenantReports() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<TenantReport | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [allReports, setAllReports] = useState<TenantReport[]>([]);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["/api/property-manager/tenant-reports/paginated", limit, offset],
  });

  useEffect(() => {
    if (paginatedData?.reports) {
      if (offset === 0) {
        setAllReports(paginatedData.reports);
      } else {
        setAllReports(prev => [...prev, ...paginatedData.reports]);
      }
    }
  }, [paginatedData, offset]);

  const { data: workers } = useQuery<any[]>({
    queryKey: ["/api/property-manager/workers"],
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/property-manager/tenant-reports/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/tenant-reports/paginated"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      setIsAssignDialogOpen(false);
      setSelectedReport(null);
    },
  });

  const handleAssignWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReport) return;
    const formData = new FormData(e.currentTarget);
    const workerId = formData.get("workerId");
    updateReportMutation.mutate({
      id: selectedReport.report.id,
      assignedTo: workerId || null,
      status: workerId ? "IN_PROGRESS" : "PENDING",
    });
  };

  const markResolved = (reportId: string) => {
    updateReportMutation.mutate({
      id: reportId,
      status: "RESOLVED",
      resolvedAt: new Date().toISOString(),
    });
  };

  const filteredReports = allReports?.filter((r) => {
    if (severityFilter !== "all" && r.report.severity !== severityFilter) return false;
    if (statusFilter !== "all" && r.report.status !== statusFilter) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "URGENT":
        return "bg-red-500";
      case "HIGH":
        return "bg-orange-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "LOW":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "bg-green-500";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "PENDING":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="heading-tenant-reports">
            Tenant Reports
          </h1>
          <p className="text-muted-foreground mb-6">
            Manage maintenance requests submitted by tenants
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40" data-testid="select-severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(severityFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSeverityFilter("all");
                setStatusFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      {!filteredReports || filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground">
              {severityFilter !== "all" || statusFilter !== "all"
                ? "No reports match your filters"
                : "Tenant maintenance requests will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.report.id} data-testid={`report-row-${report.report.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{report.report.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {report.report.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {report.property?.property?.name || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.report.issueType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(report.report.severity)}>
                      {report.report.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      {report.report.tenantName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {report.report.tenantName}
                        </div>
                      )}
                      {report.report.tenantPhone && (
                        <div className="text-xs text-muted-foreground">
                          {report.report.tenantPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {report.worker?.name || "Unassigned"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(report.report.reportedAt), "MMM d")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(report.report.status)}>
                      {report.report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {report.report.status !== "RESOLVED" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsAssignDialogOpen(true);
                            }}
                            data-testid={`button-assign-${report.report.id}`}
                          >
                            Assign
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markResolved(report.report.id)}
                            data-testid={`button-resolve-${report.report.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Load More Button */}
      {paginatedData?.pagination?.hasMore && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => setOffset(prev => prev + limit)} 
            disabled={isLoading}
            data-testid="button-load-more-tenant-reports"
            variant="outline"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More ({paginatedData.pagination.total - allReports.length} remaining)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Assign Worker Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent data-testid="dialog-assign-worker">
          <DialogHeader>
            <DialogTitle>Assign Worker</DialogTitle>
            <DialogDescription>
              Assign a worker to handle this maintenance request
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <form onSubmit={handleAssignWorker}>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-1">{selectedReport.report.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedReport.report.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge>{selectedReport.report.issueType}</Badge>
                    <Badge className={getSeverityColor(selectedReport.report.severity)}>
                      {selectedReport.report.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label htmlFor="workerId">Assign To</Label>
                  <Select name="workerId" required>
                    <SelectTrigger data-testid="select-worker-assign">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers
                        ?.filter((w: any) => w.status === "ACTIVE")
                        .map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} - {w.role}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                  data-testid="button-cancel-assign"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateReportMutation.isPending} data-testid="button-submit-assign">
                  {updateReportMutation.isPending ? "Assigning..." : "Assign Worker"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
