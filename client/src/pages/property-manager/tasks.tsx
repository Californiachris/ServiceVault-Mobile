import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { ClipboardList, Plus, Filter, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Task {
  task: {
    id: string;
    title: string;
    description: string | null;
    taskType: string;
    priority: string;
    status: string;
    dueDate: string | null;
    completedAt: string | null;
    createdAt: string;
  };
  property: any;
  worker: any | null;
}

export default function Tasks() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
    setAllTasks([]);
  }, [statusFilter, priorityFilter]);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["/api/property-manager/tasks/paginated", { limit, offset, status: statusFilter, priority: priorityFilter }],
    queryFn: async ({ queryKey }) => {
      const endpoint = queryKey[0] as string;
      const params = queryKey[1] as Record<string, any>;
      
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all' && value !== 'ALL' && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`${endpoint}?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (paginatedData?.tasks) {
      if (offset === 0) {
        setAllTasks(paginatedData.tasks);
      } else {
        setAllTasks(prev => [...prev, ...paginatedData.tasks]);
      }
    }
  }, [paginatedData, offset]);

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/property-manager/properties"],
  });

  const { data: workers } = useQuery<any[]>({
    queryKey: ["/api/property-manager/workers"],
  });

  const addTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/property-manager/tasks", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/tasks/paginated"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/property-manager/tasks/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/tasks/paginated"], exact: false });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
  });

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      managedPropertyId: formData.get("propertyId"),
      title: formData.get("title"),
      description: formData.get("description") || null,
      taskType: formData.get("taskType"),
      priority: formData.get("priority"),
      assignedTo: formData.get("workerId") || null,
      dueDate: formData.get("dueDate") || null,
    };
    addTaskMutation.mutate(data);
  };

  // Server-side filtering is now handled by the backend
  // No need for client-side filtering
  const filteredTasks = allTasks;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
      case "COMPLETED":
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="heading-tasks">
              Tasks
            </h1>
            <p className="text-muted-foreground">
              Create and manage tasks for your properties
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="lg" data-testid="button-add-task">
            <Plus className="mr-2 h-5 w-5" />
            Create Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40" data-testid="select-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== "all" || priorityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      {!filteredTasks || filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-6">
              {statusFilter !== "all" || priorityFilter !== "all"
                ? "No tasks match your filters"
                : "Create your first task to get started"}
            </p>
            {statusFilter === "all" && priorityFilter === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-task">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.task.id} data-testid={`task-row-${task.task.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.task.title}</div>
                      {task.task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">{task.task.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.property?.property?.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.task.taskType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.task.priority)}>
                      {task.task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.worker?.name || "Unassigned"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.task.dueDate ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(task.task.dueDate), "MMM d, yyyy")}
                      </div>
                    ) : (
                      "No due date"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(task.task.status)}>
                      {task.task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {task.task.status !== "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateTaskMutation.mutate({
                              id: task.task.id,
                              status: task.task.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED",
                            })
                          }
                          data-testid={`button-update-status-${task.task.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
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
            data-testid="button-load-more-tasks"
            variant="outline"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More ({paginatedData.pagination.total - allTasks.length} remaining)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Assign a task to a property and worker
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTask}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="propertyId">Property *</Label>
                <Select name="propertyId" required>
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.property?.name || p.property?.addressLine1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Fix leaking faucet"
                  required
                  data-testid="input-task-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed task description..."
                  rows={3}
                  data-testid="input-task-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taskType">Task Type *</Label>
                  <Select name="taskType" required>
                    <SelectTrigger data-testid="select-task-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSPECTION">Inspection</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="REPAIR">Repair</SelectItem>
                      <SelectItem value="CLEANING">Cleaning</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select name="priority" required>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workerId">Assign To</Label>
                  <Select name="workerId">
                    <SelectTrigger data-testid="select-worker">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
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
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    data-testid="input-due-date"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button type="submit" disabled={addTaskMutation.isPending} data-testid="button-submit-add">
                {addTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
