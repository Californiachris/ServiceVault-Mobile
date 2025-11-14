import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Users, Plus, Phone, Mail, Edit, CheckCircle2, X, Search } from "lucide-react";
import { format } from "date-fns";

interface Worker {
  id: string;
  propertyManagerId: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  status: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export default function Workers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const { data: workers, isLoading } = useQuery<Worker[]>({
    queryKey: ["/api/property-manager/workers"],
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/property-manager/workers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/workers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Worker added successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add worker",
        variant: "destructive",
      });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/property-manager/workers/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/workers"] });
      toast({
        title: "Success",
        description: "Worker updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedWorker(null);
    },
  });

  const handleAddWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      role: formData.get("role"),
      phone: formData.get("phone"),
      email: formData.get("email") || null,
    };
    addWorkerMutation.mutate(data);
  };

  const handleEditWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWorker) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      id: selectedWorker.id,
      name: formData.get("name"),
      role: formData.get("role"),
      phone: formData.get("phone"),
      email: formData.get("email") || null,
    };
    updateWorkerMutation.mutate(data);
  };

  const toggleWorkerStatus = (worker: Worker) => {
    const newStatus = worker.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateWorkerMutation.mutate({ id: worker.id, status: newStatus });
  };

  const filteredWorkers = workers?.filter((w) => {
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.role.toLowerCase().includes(query) ||
      w.phone.includes(query) ||
      (w.email && w.email.toLowerCase().includes(query))
    );
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="heading-workers">
              Workers
            </h1>
            <p className="text-muted-foreground">
              Manage your team members and their assignments
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="lg" data-testid="button-add-worker">
            <Plus className="mr-2 h-5 w-5" />
            Add Worker
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, role, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-workers"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {filteredWorkers?.length || 0} results
            </Badge>
          )}
        </div>
      </div>

      {/* Workers Table */}
      {!filteredWorkers || filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No workers found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? "No workers match your search" : "Add your first worker to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-worker">
                <Plus className="mr-2 h-4 w-4" />
                Add Worker
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow key={worker.id} data-testid={`worker-row-${worker.id}`}>
                  <TableCell className="font-medium">{worker.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{worker.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{worker.phone}</span>
                      </div>
                      {worker.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{worker.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={worker.status === "ACTIVE" ? "default" : "secondary"} className={worker.status === "ACTIVE" ? "bg-green-500" : ""}>
                      {worker.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(worker.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWorker(worker);
                          setIsEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-${worker.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWorkerStatus(worker)}
                        data-testid={`button-toggle-status-${worker.id}`}
                      >
                        {worker.status === "ACTIVE" ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Worker Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-worker">
          <DialogHeader>
            <DialogTitle>Add New Worker</DialogTitle>
            <DialogDescription>
              Add a team member to your worker roster
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddWorker}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  data-testid="input-worker-name"
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  name="role"
                  placeholder="Plumber, Electrician, Maintenance, etc."
                  required
                  data-testid="input-worker-role"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  required
                  data-testid="input-worker-phone"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="worker@example.com"
                  data-testid="input-worker-email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button type="submit" disabled={addWorkerMutation.isPending} data-testid="button-submit-add">
                {addWorkerMutation.isPending ? "Adding..." : "Add Worker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-worker">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
            <DialogDescription>
              Update worker information
            </DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <form onSubmit={handleEditWorker}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedWorker.name}
                    required
                    data-testid="input-edit-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role">Role *</Label>
                  <Input
                    id="edit-role"
                    name="role"
                    defaultValue={selectedWorker.role}
                    required
                    data-testid="input-edit-role"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone Number *</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    defaultValue={selectedWorker.phone}
                    required
                    data-testid="input-edit-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email (Optional)</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={selectedWorker.email || ""}
                    data-testid="input-edit-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateWorkerMutation.isPending} data-testid="button-submit-edit">
                  {updateWorkerMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
