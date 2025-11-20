import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  Package,
  AlertCircle,
  Wrench,
  Shield,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";

type Reminder = {
  id: string;
  assetId: string;
  propertyId: string | null;
  dueAt: string;
  type: string;
  title: string | null;
  description: string | null;
  status: string;
  frequency: string | null;
  nextDueAt: string | null;
  createdAt: string;
  assetName: string | null;
  assetCategory: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
};

export default function ContractorReminders() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: remindersData, isLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ["/api/contractor/reminders"],
  });

  const reminders = remindersData?.reminders || [];

  // Complete reminder mutation
  const completeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await apiRequest("PATCH", `/api/reminders/${reminderId}`, {
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/reminders"] });
      toast({
        title: "Reminder completed",
        description: "The reminder has been marked as complete.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to complete reminder",
        variant: "destructive",
      });
    },
  });

  const filteredReminders = reminders.filter((reminder: Reminder) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "warranty") return reminder.type === "WARRANTY_EXPIRING";
    if (activeFilter === "maintenance") return reminder.type === "MAINTENANCE_DUE";
    if (activeFilter === "service") return reminder.type === "SERVICE_NEEDED";
    return true;
  });

  const overdueReminders = filteredReminders.filter((r: Reminder) => isPast(new Date(r.dueAt)));
  const upcomingReminders = filteredReminders.filter((r: Reminder) => !isPast(new Date(r.dueAt)));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "WARRANTY_EXPIRING":
        return <Shield className="h-5 w-5" />;
      case "MAINTENANCE_DUE":
        return <Wrench className="h-5 w-5" />;
      case "SERVICE_NEEDED":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "WARRANTY_EXPIRING":
        return "text-blue-500 bg-blue-500/10";
      case "MAINTENANCE_DUE":
        return "text-orange-500 bg-orange-500/10";
      case "SERVICE_NEEDED":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getDueDateBadge = (dueAt: string) => {
    const dueDate = new Date(dueAt);
    if (isPast(dueDate)) {
      return <Badge variant="destructive" data-testid="badge-overdue">Overdue</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge className="bg-orange-500" data-testid="badge-today">Due Today</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge variant="secondary" data-testid="badge-tomorrow">Tomorrow</Badge>;
    }
    return <Badge variant="outline" data-testid="badge-upcoming">{format(dueDate, "MMM d")}</Badge>;
  };

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-5xl font-bold mb-2 tracking-tight" data-testid="heading-reminders">Reminders</h1>
            <p className="text-lg text-slate-400">
              Stay on top of maintenance for your installed assets.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/scan">
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]" data-testid="button-scan-asset">
                <Package className="h-4 w-4 mr-2" />
                Scan Asset
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Premium Design */}
      <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl" data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white transition-all">All</TabsTrigger>
          <TabsTrigger value="warranty" data-testid="tab-warranty" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all">Warranty</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all">Maintenance</TabsTrigger>
          <TabsTrigger value="service" data-testid="tab-service" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white transition-all">Service</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading reminders...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredReminders.length === 0 && (
        <Card className="border-dashed bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl" data-testid="empty-state">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-slate-800/50 rounded-full mb-4">
              <BellOff className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reminders yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Install assets with warranties or maintenance schedules to receive reminders.
            </p>
            <Link href="/scan">
              <Button data-testid="button-scan-first-asset" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">Scan First Asset</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      {!isLoading && filteredReminders.length > 0 && (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Overdue ({overdueReminders.length})
              </h2>
              <div className="space-y-3">
                {overdueReminders.map((reminder: Reminder) => (
                  <Card key={reminder.id} className="border-red-500/50 bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl hover:shadow-3xl transition-all duration-200 hover:scale-[1.01]" data-testid={`card-reminder-${reminder.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                            {getTypeIcon(reminder.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1" data-testid="text-reminder-title">
                              {reminder.title || `${reminder.type.replace(/_/g, " ")}`}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                <span>{reminder.assetName || "Unknown Asset"}</span>
                                {reminder.assetCategory && (
                                  <Badge variant="outline" className="text-xs">
                                    {reminder.assetCategory}
                                  </Badge>
                                )}
                              </div>
                              {reminder.propertyAddress && (
                                <div className="text-xs">{reminder.propertyAddress}</div>
                              )}
                              {reminder.description && (
                                <p className="text-xs mt-2">{reminder.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDueDateBadge(reminder.dueAt)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/asset/${reminder.assetId}`}>
                          <Button variant="outline" size="sm" data-testid="button-view-asset">
                            View Asset
                          </Button>
                        </Link>
                        <Button
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                          size="sm"
                          onClick={() => completeReminderMutation.mutate(reminder.id)}
                          disabled={completeReminderMutation.isPending}
                          data-testid="button-complete"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming ({upcomingReminders.length})
              </h2>
              <div className="space-y-3">
                {upcomingReminders.map((reminder: Reminder) => (
                  <Card key={reminder.id} className="bg-slate-900/80 border border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl hover:shadow-3xl transition-all duration-200 hover:scale-[1.01]" data-testid={`card-reminder-${reminder.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                            {getTypeIcon(reminder.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1" data-testid="text-reminder-title">
                              {reminder.title || `${reminder.type.replace(/_/g, " ")}`}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                <span>{reminder.assetName || "Unknown Asset"}</span>
                                {reminder.assetCategory && (
                                  <Badge variant="outline" className="text-xs">
                                    {reminder.assetCategory}
                                  </Badge>
                                )}
                              </div>
                              {reminder.propertyAddress && (
                                <div className="text-xs">{reminder.propertyAddress}</div>
                              )}
                              {reminder.description && (
                                <p className="text-xs mt-2">{reminder.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDueDateBadge(reminder.dueAt)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/asset/${reminder.assetId}`}>
                          <Button variant="outline" size="sm" data-testid="button-view-asset">
                            View Asset
                          </Button>
                        </Link>
                        <Button
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                          size="sm"
                          onClick={() => completeReminderMutation.mutate(reminder.id)}
                          disabled={completeReminderMutation.isPending}
                          data-testid="button-complete"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
