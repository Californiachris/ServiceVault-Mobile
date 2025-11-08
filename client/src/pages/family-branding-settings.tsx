import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Navigation from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Image as ImageIcon, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FamilyBrandingSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [familyName, setFamilyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Check if user has family branding feature
  const { data: subscription } = useQuery<{
    featureFamilyBranding: boolean;
    familyName: string | null;
    familyLogoUrl: string | null;
  }>({
    queryKey: ['/api/subscription/status'],
  });

  // Initialize form with existing values
  useState(() => {
    if (subscription?.familyName) {
      setFamilyName(subscription.familyName);
    }
    if (subscription?.familyLogoUrl) {
      setLogoPreview(subscription.familyLogoUrl);
    }
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let logoUrl = subscription?.familyLogoUrl || null;

      // Upload logo if changed
      if (logoFile) {
        // Step 1: Get upload URL and object path
        const uploadRes = await apiRequest('POST', '/api/upload/branding');
        const uploadParams = await uploadRes.json();

        // Step 2: Upload file to object storage
        const uploadResponse = await fetch(uploadParams.uploadURL, {
          method: 'PUT',
          headers: {
            'Content-Type': logoFile.type,
          },
          body: logoFile,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo to storage');
        }

        // Step 3: Use the object path as the logo URL
        logoUrl = uploadParams.objectPath;
      }

      // Save family name and logo URL
      return apiRequest('PATCH', '/api/user/family-branding', {
        familyName: familyName.trim(),
        familyLogoUrl: logoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Family branding updated successfully",
      });
      setUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update family branding",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  if (!user) {
    return null;
  }

  if (!subscription?.featureFamilyBranding) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Family Branding</CardTitle>
              <CardDescription>
                Add your family name and logo to all your property stickers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Family branding is a $5 add-on. Please visit the pricing page to upgrade your plan.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <Button onClick={() => setLocation('/pricing')} data-testid="button-upgrade">
                  View Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Family Branding</CardTitle>
            <CardDescription>
              Customize your family's identity on all property stickers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Family Name */}
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                id="familyName"
                placeholder="The Smith Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                maxLength={50}
                data-testid="input-family-name"
              />
              <p className="text-xs text-muted-foreground">
                This will appear on all your property stickers and public property page
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Family Logo</Label>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Family logo preview"
                      className="h-24 w-24 object-contain border rounded-lg"
                      data-testid="img-logo-preview"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                    data-testid="input-logo-upload"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a square logo (PNG, JPG, or SVG). Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview */}
            {(familyName || logoPreview) && (
              <div className="pt-6 border-t">
                <h3 className="text-sm font-semibold mb-3">Preview</h3>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-12 w-12 object-contain rounded-lg"
                      />
                    )}
                    {familyName && (
                      <div>
                        <div className="text-2xl font-bold">{familyName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          FixTrack Protected
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 flex gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!familyName.trim() || uploading}
                data-testid="button-save-branding"
              >
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/dashboard')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
