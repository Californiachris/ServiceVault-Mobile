import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail, Smartphone, BellOff, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const notificationSettingsSchema = z.object({
  phone: z.string().optional(),
  notificationPreference: z.enum(['EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS', 'NONE']),
}).refine(
  (data) => {
    const requiresPhone = data.notificationPreference === 'SMS_ONLY' || data.notificationPreference === 'EMAIL_AND_SMS';
    if (requiresPhone && (!data.phone || !data.phone.trim())) {
      return false;
    }
    return true;
  },
  {
    message: "Phone number is required for SMS notifications",
    path: ["phone"],
  }
);

type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>;

interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  phone?: string | null;
  notificationPreference?: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    values: {
      phone: user?.phone || '',
      notificationPreference: (user?.notificationPreference as any) || 'EMAIL_AND_SMS',
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: NotificationSettingsForm) => {
      const response = await fetch('/api/user/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(errorData.error || 'Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: NotificationSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  // DEV TESTING MODE: Delete Account
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/user/delete', 'DELETE');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
      // Logout and redirect to home
      window.location.href = '/api/logout';
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message || "Failed to delete account. Please try again or contact support.",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="settings-loading">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const notificationOptions = [
    {
      value: 'EMAIL_AND_SMS',
      label: 'Email & SMS',
      description: 'Receive notifications via both email and text message',
      icon: Bell,
    },
    {
      value: 'EMAIL_ONLY',
      label: 'Email Only',
      description: 'Only receive email notifications',
      icon: Mail,
    },
    {
      value: 'SMS_ONLY',
      label: 'SMS Only',
      description: 'Only receive text message notifications',
      icon: Smartphone,
    },
    {
      value: 'NONE',
      label: 'No Notifications',
      description: 'Disable all automatic notifications',
      icon: BellOff,
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="settings-title">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notification settings
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive maintenance reminders and important updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1 (555) 123-4567"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      Required for SMS notifications. Include country code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationPreference"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>Notification Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid gap-4"
                      >
                        {notificationOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <div key={option.value} className="flex items-start space-x-3">
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                data-testid={`radio-${option.value.toLowerCase()}`}
                              />
                              <Label
                                htmlFor={option.value}
                                className="flex items-start gap-3 cursor-pointer flex-1"
                              >
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details from Replit authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="mt-1 text-sm font-medium" data-testid="text-email">
                  {user?.email || 'Not provided'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <div className="mt-1 text-sm font-medium" data-testid="text-name">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Not provided'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Account Type</Label>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary" data-testid="text-role">
                    {user?.role || 'HOMEOWNER'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>

      {/* DEV TESTING MODE: Delete Account Section */}
      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data (DEV TESTING ONLY)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleteAccountMutation.isPending}
                data-testid="button-delete-account-trigger"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All properties and assets</li>
                    <li>All documents and warranties</li>
                    <li>All maintenance reminders</li>
                    <li>All service history</li>
                    <li>Your contractor/fleet profile (if applicable)</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccountMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
