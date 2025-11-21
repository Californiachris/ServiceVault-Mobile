import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import {
  Users,
  ArrowLeft,
  Plus,
  Clock,
  Package,
  Calendar as CalendarIcon,
  Download,
  Copy,
  Check,
} from "lucide-react";

const addWorkerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["INSTALLER", "FOREMAN", "ADMIN"]),
});

const assignTaskSchema = z.object({
  workerId: z.string().min(1, "Worker is required"),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  scheduledFor: z.date(),
});

type AddWorkerData = z.infer<typeof addWorkerSchema>;
type AssignTaskData = z.infer<typeof assignTaskSchema>;

interface WorkerCredentials {
  username: string;
  password: string;
  loginUrl: string;
}

export default function ContractorTeam() {
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [workerCredentials, setWorkerCredentials] = useState<WorkerCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  // Real-time updates
  useWebSocket("/ws", (message) => {
    if (message.type === "worker_check_in" || message.type === "worker_check_out") {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/workers"] });
      toast({
        title: message.type === "worker_check_in" ? "Worker Checked In" : "Worker Checked Out",
        description: message.data.workerName || "A worker has updated their status",
      });
    }
    if (message.type === "task_completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/tasks"] });
      toast({
        title: "Task Completed",
        description: message.data.taskTitle || "A task has been completed",
      });
    }
  });

  const { data: workersData, isLoading } = useQuery<{ workers: any[] }>({
    queryKey: ["/api/contractor/workers"],
  });

  const workers = workersData?.workers || [];

  const addWorkerForm = useForm<AddWorkerData>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      role: "INSTALLER",
    },
  });

  const assignTaskForm = useForm<AssignTaskData>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      workerId: "",
      title: "",
      description: "",
      address: "",
      scheduledFor: new Date(),
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: (data: AddWorkerData) => apiRequest("/api/contractor/workers", "POST", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/workers"] });
      toast({ title: "Worker added successfully" });
      setShowAddWorker(false);
      addWorkerForm.reset();
      
      // Show credentials modal
      if (response.credentials) {
        setWorkerCredentials(response.credentials);
      }
    },
    onError: () => {
      toast({ title: "Failed to add worker", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const assignTaskMutation = useMutation({
    mutationFn: (data: AssignTaskData) => apiRequest("/api/contractor/tasks", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/tasks"] });
      toast({ title: "Task assigned successfully" });
      setShowAssignTask(false);
      assignTaskForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to assign task", variant: "destructive" });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2 tracking-tight" data-testid="heading-team">Team</h1>
            <p className="text-lg text-slate-400">See who's on your crew, hours, and installs.</p>
          </div>
          <Dialog open={showAddWorker} onOpenChange={setShowAddWorker}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]" data-testid="button-add-worker">
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <Form {...addWorkerForm}>
                <form onSubmit={addWorkerForm.handleSubmit((data) => addWorkerMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={addWorkerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-worker-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addWorkerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-worker-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addWorkerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" data-testid="input-worker-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addWorkerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-worker-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            <SelectItem value="INSTALLER" data-testid="option-installer">Installer</SelectItem>
                            <SelectItem value="FOREMAN" data-testid="option-foreman">Foreman</SelectItem>
                            <SelectItem value="ADMIN" data-testid="option-admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setShowAddWorker(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addWorkerMutation.isPending} data-testid="button-submit-worker" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                      {addWorkerMutation.isPending ? "Adding..." : "Add Worker"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule Assignments Button - Premium Design */}
      <div className="mb-6">
        <Dialog open={showAssignTask} onOpenChange={setShowAssignTask}>
          <DialogTrigger asChild>
            <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl hover:border-cyan-500/50 hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.01] cursor-pointer" data-testid="card-schedule-assignments">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full inline-flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/50">
                    <CalendarIcon className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 tracking-tight">Assign Job to Team Member</h2>
                  <p className="text-base text-slate-400">
                    Schedule tomorrow's tasks and job assignments
                  </p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Job</DialogTitle>
            </DialogHeader>
            <Form {...assignTaskForm}>
              <form onSubmit={assignTaskForm.handleSubmit((data) => assignTaskMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={assignTaskForm.control}
                  name="workerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assign-worker">
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workers.map((worker: any) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} ({worker.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTaskForm.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-select-date">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTaskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Install water heater at 123 Main St" data-testid="input-task-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTaskForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Address (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main St, City, ST" data-testid="input-task-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTaskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional instructions or details..." data-testid="textarea-task-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setShowAssignTask(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignTaskMutation.isPending} data-testid="button-submit-assignment" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                    {assignTaskMutation.isPending ? "Assigning..." : "Assign Job"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workers List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : workers.length === 0 ? (
          <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No team members yet</p>
              <Button onClick={() => setShowAddWorker(true)} data-testid="button-add-first-worker" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <Plus className="h-4 w-4 mr-2" />
                Add First Team Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          workers.map((worker: any) => (
            <Link key={worker.id} href={`/contractor/workers/${worker.id}`}>
              <Card className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl hover:border-cyan-500/50 hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.01] cursor-pointer group" data-testid={`worker-card-${worker.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl tracking-tight">{worker.name}</h3>
                        <Badge variant="outline" className="backdrop-blur-sm">{worker.role}</Badge>
                        <Badge variant={worker.status === 'ACTIVE' ? 'default' : 'secondary'} className="backdrop-blur-sm">
                          {worker.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-slate-400">
                        {worker.email && <p>Email: {worker.email}</p>}
                        {worker.phone && <p>Phone: {worker.phone}</p>}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Today: 0h
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            Installs: 0
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-view-worker-${worker.id}`} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-transparent">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Worker Credentials Modal */}
      <Dialog open={!!workerCredentials} onOpenChange={() => setWorkerCredentials(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900/95 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Worker Account Created!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Share these login credentials with your worker. They can use these to access their portal.
            </p>
            
            {workerCredentials && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/50 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Username</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(workerCredentials.username, 'username')}
                      data-testid="button-copy-username"
                      className="hover:bg-gradient-to-r hover:from-teal-500 hover:to-cyan-600 hover:text-white transition-all"
                    >
                      {copiedField === 'username' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-lg font-mono font-semibold" data-testid="text-username">
                    {workerCredentials.username}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/50 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Password</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(workerCredentials.password, 'password')}
                      data-testid="button-copy-password"
                      className="hover:bg-gradient-to-r hover:from-teal-500 hover:to-cyan-600 hover:text-white transition-all"
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-lg font-mono font-semibold" data-testid="text-password">
                    {workerCredentials.password}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/50 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Login URL</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(workerCredentials.loginUrl, 'url')}
                      data-testid="button-copy-url"
                      className="hover:bg-gradient-to-r hover:from-teal-500 hover:to-cyan-600 hover:text-white transition-all"
                    >
                      {copiedField === 'url' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-mono break-all text-slate-300" data-testid="text-login-url">
                    {workerCredentials.loginUrl}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setWorkerCredentials(null)} data-testid="button-close-credentials" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
