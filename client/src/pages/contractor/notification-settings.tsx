import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Bell, Mail, MessageSquare } from "lucide-react";

export default function NotificationSettings() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ preferences: any }>({
    queryKey: ["/api/contractor/notification-preferences"],
  });

  const preferences = data?.preferences;

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("PATCH", "/api/contractor/notification-preferences", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/notification-preferences"] });
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (field: string, value: boolean) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleMethodChange = (method: string) => {
    updateMutation.mutate({ notificationMethod: method });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-5xl font-bold mb-2 tracking-tight" data-testid="heading-notifications">Notification Settings</h1>
        <p className="text-lg text-muted-foreground">
          Control how and when you receive updates about your team.
        </p>
      </div>

      <Card className="backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg" data-testid="card-worker-notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Bell className="h-6 w-6" />
            Worker Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all backdrop-blur-sm">
            <div className="space-y-0.5">
              <Label htmlFor="check-in" className="text-base font-semibold">Check-In Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when workers clock in for their shifts
              </p>
            </div>
            <Switch
              id="check-in"
              checked={preferences?.notifyCheckIn || false}
              onCheckedChange={(checked) => handleToggle("notifyCheckIn", checked)}
              disabled={updateMutation.isPending}
              data-testid="toggle-check-in"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all backdrop-blur-sm">
            <div className="space-y-0.5">
              <Label htmlFor="check-out" className="text-base font-semibold">Check-Out Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when workers complete their shifts
              </p>
            </div>
            <Switch
              id="check-out"
              checked={preferences?.notifyCheckOut || false}
              onCheckedChange={(checked) => handleToggle("notifyCheckOut", checked)}
              disabled={updateMutation.isPending}
              data-testid="toggle-check-out"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all backdrop-blur-sm">
            <div className="space-y-0.5">
              <Label htmlFor="task-complete" className="text-base font-semibold">Task Completion</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when workers mark tasks as complete
              </p>
            </div>
            <Switch
              id="task-complete"
              checked={preferences?.notifyTaskComplete || false}
              onCheckedChange={(checked) => handleToggle("notifyTaskComplete", checked)}
              disabled={updateMutation.isPending}
              data-testid="toggle-task-complete"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg" data-testid="card-notification-method">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageSquare className="h-6 w-6" />
            Notification Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all cursor-pointer backdrop-blur-sm hover:bg-primary/5 data-[checked=true]:border-primary data-[checked=true]:bg-primary/10" data-checked={preferences?.notificationMethod === "EMAIL"}>
            <input
              type="radio"
              id="email"
              name="method"
              value="EMAIL"
              checked={preferences?.notificationMethod === "EMAIL"}
              onChange={() => handleMethodChange("EMAIL")}
              disabled={updateMutation.isPending}
              className="h-5 w-5 text-primary"
              data-testid="radio-email"
            />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Email</div>
                <div className="text-sm text-muted-foreground">Receive notifications via email</div>
              </div>
            </div>
          </label>
          <label className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all cursor-pointer backdrop-blur-sm hover:bg-primary/5 data-[checked=true]:border-primary data-[checked=true]:bg-primary/10" data-checked={preferences?.notificationMethod === "SMS"}>
            <input
              type="radio"
              id="sms"
              name="method"
              value="SMS"
              checked={preferences?.notificationMethod === "SMS"}
              onChange={() => handleMethodChange("SMS")}
              disabled={updateMutation.isPending}
              className="h-5 w-5 text-primary"
              data-testid="radio-sms"
            />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">SMS</div>
                <div className="text-sm text-muted-foreground">Receive notifications via text message</div>
              </div>
            </div>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
