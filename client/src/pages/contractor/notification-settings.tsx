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
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-1" data-testid="heading-notifications">Notification Settings</h1>
        <p className="text-muted-foreground">
          Control how and when you receive updates about your team.
        </p>
      </div>

      <Card data-testid="card-worker-notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Worker Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="check-in" className="text-base">Check-In Notifications</Label>
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="check-out" className="text-base">Check-Out Notifications</Label>
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task-complete" className="text-base">Task Completion</Label>
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

      <Card className="mt-6" data-testid="card-notification-method">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notification Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id="email"
              name="method"
              value="EMAIL"
              checked={preferences?.notificationMethod === "EMAIL"}
              onChange={() => handleToggle("notificationMethod", "EMAIL")}
              disabled={updateMutation.isPending}
              className="h-4 w-4"
              data-testid="radio-email"
            />
            <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4" />
              Email
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id="sms"
              name="method"
              value="SMS"
              checked={preferences?.notificationMethod === "SMS"}
              onChange={() => handleToggle("notificationMethod", "SMS")}
              disabled={updateMutation.isPending}
              className="h-4 w-4"
              data-testid="radio-sms"
            />
            <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
              <MessageSquare className="h-4 w-4" />
              SMS
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
