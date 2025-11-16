import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Bell, Mail, Smartphone, BellOff, Trash2, Building2, Upload, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

interface Contractor {
  id: string;
  companyName: string | null;
  logoUrl: string | null;
}

interface Logo {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  logoType: "UPLOADED" | "AI_GENERATED";
  isActive: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: contractor } = useQuery<Contractor>({
    queryKey: ['/api/dashboard/contractor'],
    enabled: user?.role === 'CONTRACTOR',
    select: (data: any) => data?.contractor,
  });

  // Fetch user's logos
  const { data: logos = [] } = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
    retry: false,
  });

  // Check if user has paid for AI logo generation
  const { data: hasAIAccess } = useQuery({
    queryKey: ['/api/logos/check-access'],
    enabled: !!user,
  });

  // Get the active logo
  const activeLogo = logos.find(logo => logo.isActive);

  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Initialize contractor state from data when contractor data loads
  useEffect(() => {
    if (contractor?.companyName) {
      setCompanyName(contractor.companyName);
    }
    if (contractor?.logoUrl) {
      setLogoPreview(contractor.logoUrl);
    }
  }, [contractor]);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Logo must be under 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveContractorBrandingMutation = useMutation({
    mutationFn: async () => {
      let logoUrl = contractor?.logoUrl || null;

      // Upload logo if changed
      if (logoFile) {
        const uploadRes = await apiRequest('POST', '/api/upload/branding');
        const uploadParams = await uploadRes.json();

        const uploadResponse = await fetch(uploadParams.uploadURL, {
          method: 'PUT',
          headers: { 'Content-Type': logoFile.type },
          body: logoFile,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo to storage');
        }

        logoUrl = uploadParams.objectPath;
      }

      return apiRequest('PATCH', '/api/contractors/me', {
        companyName: companyName.trim(),
        logoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/contractor'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Company branding updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company branding",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  // DEV TESTING MODE: Delete Account
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/user/delete');
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

  const regenerateCheckoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/logos/regenerate-checkout', {});
      return await res.json() as { url: string; demoMode?: boolean };
    },
    onSuccess: (data) => {
      if (data.demoMode) {
        toast({
          title: "Demo Mode Active",
          description: "Regeneration is free in demo mode! Redirecting to generator...",
        });
        setTimeout(() => setLocation('/logos/generator'), 1000);
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not create checkout session",
        variant: "destructive",
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

          {/* Logo Management - Available for all users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Logo Management
              </CardTitle>
              <CardDescription>
                Manage your branding for dashboard and QR stickers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Logo Display */}
              {activeLogo && (
                <div className="space-y-2">
                  <Label>Current Active Logo</Label>
                  <div className="flex items-start gap-4 p-4 border-2 rounded-lg bg-gradient-to-br from-cyan-50/30 to-purple-50/30 dark:from-cyan-950/10 dark:to-purple-950/10">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 border-2 rounded-lg overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center p-2">
                        <img
                          src={activeLogo.fileUrl}
                          alt="Active logo"
                          className="w-full h-full object-contain"
                          data-testid="img-active-logo"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                          Active
                        </Badge>
                        <Badge variant="outline">
                          {activeLogo.logoType === 'AI_GENERATED' ? 'AI Generated' : 'Uploaded'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This logo appears on your dashboard and will be used for all future QR sticker orders.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Logo Options Based on User Type */}
              <div className="space-y-4">
                <Label>Logo Options</Label>
                <div className="grid gap-3">
                  {/* Upload New Logo - Free for all users */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/logos/upload')}
                    className="w-full justify-start h-auto py-4"
                    data-testid="button-upload-new-logo"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Upload New Logo</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          Free • Upload your own logo file (PNG, JPG up to 5MB)
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* AI Generator Options */}
                  {!hasAIAccess ? (
                    // User hasn't paid - Show unlock AI button
                    <Button
                      type="button"
                      onClick={() => setLocation('/logos/generator')}
                      className="w-full justify-start h-auto py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                      data-testid="button-unlock-ai"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-white/20 p-2">
                          <Wand2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold">Unlock AI Logo Generator</div>
                          <div className="text-sm font-normal opacity-90">
                            $19.99 one-time • Unlimited generations until you pick one
                          </div>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    // User has paid - Show regenerate button
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => regenerateCheckoutMutation.mutate()}
                      className="w-full justify-start h-auto py-4 border-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      disabled={regenerateCheckoutMutation.isPending}
                      data-testid="button-regenerate-logos"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-purple-500/10 p-2">
                          {regenerateCheckoutMutation.isPending ? (
                            <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
                          ) : (
                            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-foreground">
                            {regenerateCheckoutMutation.isPending ? "Processing..." : "Regenerate New Logos"}
                          </div>
                          <div className="text-sm text-muted-foreground font-normal">
                            $5.99 per session • Generate 4 new AI logo variations
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Note:</strong> When you select a new logo (uploaded or AI-generated), you'll be asked to confirm your selection. The confirmed logo will automatically replace your current logo on your dashboard and future sticker orders.
                </p>
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
