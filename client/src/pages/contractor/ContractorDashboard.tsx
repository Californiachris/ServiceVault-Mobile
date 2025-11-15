import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, ClipboardList, Clock, CheckCircle2, Plus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  scheduledFor: z.date(),
  assignedWorkerId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Worker {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  address?: string;
  priority: string;
  status: string;
  scheduledFor: string;
  assignedWorkerName?: string;
  completedAt?: string;
}

interface WorkerStatus {
  workerId: string;
  workerName: string;
  isCheckedIn: boolean;
  checkInAt?: string;
  tasksCompleted: number;
  activeTasks: number;
}

export default function ContractorDashboard() {
  const { toast } = useToast();
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      priority: "MEDIUM",
      scheduledFor: new Date(),
    },
  });
  
  // Fetch workers
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ['/api/contractor/workers'],
  });
  
  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/contractor/tasks'],
  });
  
  // Fetch worker status
  const { data: workerStatuses = [] } = useQuery<WorkerStatus[]>({
    queryKey: ['/api/contractor/worker-status'],
  });
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await apiRequest("POST", "/api/contractor/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/worker-status'] });
      setShowCreateTaskDialog(false);
      form.reset();
      toast({
        title: "Task Created",
        description: "The task has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };
  
  const pendingTasks = tasks.filter(t => t.status === "PENDING");
  const completedTasks = tasks.filter(t => t.status === "COMPLETED");
  const activeWorkers = workerStatuses.filter(w => w.isCheckedIn).length;
  
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contractor Dashboard</h1>
            <p className="text-muted-foreground">Manage your team and tasks</p>
          </div>
          
          <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white" data-testid="button-create-task">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Install HVAC unit" data-testid="input-task-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Task details..." data-testid="input-task-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main St" data-testid="input-task-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="assignedWorkerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Worker (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-worker">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {workers.map((worker) => (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeWorkers}</div>
              <p className="text-xs text-muted-foreground">Currently clocked in</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workers.length}</div>
              <p className="text-xs text-muted-foreground">In your team</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <p className="text-xs text-muted-foreground">Need to be completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Worker Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Worker Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workerStatuses.map((status) => (
                <div 
                  key={status.workerId}
                  className="p-4 border rounded-lg space-y-2"
                  data-testid={`worker-card-${status.workerId}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{status.workerName}</h4>
                    <Badge variant={status.isCheckedIn ? "default" : "secondary"}>
                      {status.isCheckedIn ? "Active" : "Offline"}
                    </Badge>
                  </div>
                  {status.isCheckedIn && status.checkInAt && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Since {format(new Date(status.checkInAt), "h:mm a")}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tasks:</span>
                    <span className="font-medium">{status.activeTasks} active, {status.tasksCompleted} completed</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              All Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks yet. Create one to get started!
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="p-4 border rounded-lg space-y-2"
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge variant={
                            task.status === 'COMPLETED' ? 'default' :
                            task.priority === 'URGENT' ? 'destructive' :
                            task.priority === 'HIGH' ? 'default' : 
                            'secondary'
                          }>
                            {task.status === 'COMPLETED' ? 'Completed' : task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {task.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.address}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.scheduledFor), "MMM d, yyyy")}
                      </div>
                      {task.assignedWorkerName && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {task.assignedWorkerName}
                        </div>
                      )}
                    </div>
                    {task.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        Completed {format(new Date(task.completedAt), "MMM d 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
