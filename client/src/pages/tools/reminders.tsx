import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellRing, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Settings,
  Zap
} from "lucide-react";

export default function RemindersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [allReminders, setAllReminders] = useState<any[]>([]);

  const { data: paginatedData, isLoading: remindersLoading } = useQuery({
    queryKey: ["/api/reminders/paginated", limit, offset],
    enabled: isAuthenticated,
    retry: false,
  });

  // Accumulate reminders as we load more
  useEffect(() => {
    if (paginatedData?.reminders) {
      if (offset === 0) {
        setAllReminders(paginatedData.reminders);
      } else {
        setAllReminders(prev => [...prev, ...paginatedData.reminders]);
      }
    }
  }, [paginatedData, offset]);

  const reminders = paginatedData;
  const upcomingReminders = allReminders;

  const runRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/reminders/due");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reminders Processed",
        description: `Processed ${data.processed || 0} due reminders`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/paginated"], exact: false });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process reminders",
        variant: "destructive",
      });
    },
  });

  const handleRunReminders = async () => {
    setIsProcessing(true);
    try {
      await runRemindersMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadMore = () => {
    if (paginatedData?.pagination?.hasMore) {
      setOffset(prev => prev + limit);
    }
  };

  const reminderTypeConfig = {
    WARRANTY_EXPIRATION: { 
      label: 'Warranty Expiration', 
      icon: AlertTriangle, 
      color: 'bg-red-500/10 text-red-400 border-red-500/20' 
    },
    MAINTENANCE_DUE: { 
      label: 'Maintenance Due', 
      icon: Settings, 
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
    },
    INSPECTION_REQUIRED: { 
      label: 'Inspection Required', 
      icon: CheckCircle2, 
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
    },
    SERVICE_INTERVAL: { 
      label: 'Service Interval', 
      icon: Clock, 
      color: 'bg-green-500/10 text-green-400 border-green-500/20' 
    },
  };

  const priorityConfig = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Reminders</h1>
          <p className="text-muted-foreground">
            Automatic notifications for warranty expirations, maintenance schedules, and service intervals.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reminder Processing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Run Reminder Job
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Process all due reminders and send notifications. This job typically runs automatically 
                    every day, but you can trigger it manually here.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleRunReminders}
                      disabled={isProcessing || runRemindersMutation.isPending}
                      data-testid="button-run-reminders"
                    >
                      {isProcessing || runRemindersMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Run Now
                        </>
                      )}
                    </Button>
                    
                    {reminders && (
                      <div className="text-sm text-muted-foreground">
                        Last run: {reminders.processed !== undefined ? 'Just now' : 'Unknown'}
                        {reminders.processed !== undefined && (
                          <span className="ml-2 font-medium">
                            ({reminders.processed} reminders processed)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remindersLoading && offset === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : upcomingReminders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No reminders scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingReminders.map((reminder) => {
                      const reminderType = reminder.type || 'SERVICE_INTERVAL';
                      const typeConfig = reminderTypeConfig[reminderType as keyof typeof reminderTypeConfig];
                      const Icon = typeConfig?.icon || Clock;
                      const dueDate = reminder.dueAt ? new Date(reminder.dueAt) : new Date();
                      const timeUntil = formatTimeUntil(dueDate);
                      const isOverdue = timeUntil === 'Overdue';
                      const isDueToday = timeUntil === 'Due today';
                      
                      return (
                        <div 
                          key={reminder.id}
                          className={`p-4 border rounded-lg transition-colors hover:bg-muted/30 ${
                            isOverdue ? 'border-red-500/50 bg-red-500/5' : 
                            isDueToday ? 'border-orange-500/50 bg-orange-500/5' : 
                            'border-border'
                          }`}
                          data-testid={`reminder-${reminder.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig?.color || 'bg-muted'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{reminder.title || 'Untitled Reminder'}</h3>
                                <p className="text-sm text-muted-foreground">{reminder.assetId || 'No asset'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  isDueToday ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                  'bg-green-500/10 text-green-400 border-green-500/20'
                                }
                              >
                                {timeUntil}
                              </Badge>
                            </div>
                          </div>
                          
                          {reminder.message && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {reminder.message}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Due: {dueDate.toLocaleDateString()}</span>
                            <Badge variant="outline" className={typeConfig?.color}>
                              {typeConfig?.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    
                    {paginatedData?.pagination?.hasMore && (
                      <div className="pt-4">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleLoadMore}
                          disabled={remindersLoading}
                          data-testid="button-load-more-reminders"
                        >
                          {remindersLoading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Load More (${paginatedData.pagination.total - allReminders.length} remaining)`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5" />
                  Reminder Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Active</span>
                    <span className="font-semibold">24</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Due This Week</span>
                    <span className="font-semibold text-orange-400">4</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overdue</span>
                    <span className="font-semibold text-red-400">0</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sent This Month</span>
                    <span className="font-semibold">12</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-semibold text-green-400">98%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminder Types */}
            <Card>
              <CardHeader>
                <CardTitle>Reminder Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(reminderTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{config.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {key === 'WARRANTY_EXPIRATION' && 'Product warranty ending soon'}
                            {key === 'MAINTENANCE_DUE' && 'Scheduled maintenance required'}
                            {key === 'INSPECTION_REQUIRED' && 'Safety or compliance check'}
                            {key === 'SERVICE_INTERVAL' && 'Regular service schedule'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Schedules
                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Bell className="mr-2 h-4 w-4" />
                    Notification Settings
                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Calendar className="mr-2 h-4 w-4" />
                    View Calendar
                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How Reminders Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Automatic scheduling based on installation dates and warranty periods
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Smart notifications sent at optimal times before due dates
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Track completion and automatically reschedule recurring items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
