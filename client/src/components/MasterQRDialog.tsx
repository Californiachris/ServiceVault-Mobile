import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/use-entitlements";
import { apiRequest } from "@/lib/queryClient";
import { QrCode, Copy, ExternalLink, Eye, AlertTriangle, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import QRCodeSVG from "qrcode";

interface MasterQRDialogProps {
  propertyId: string;
  propertyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MasterQRResponse {
  masterIdentifier: string | null;
  publicVisibility: {
    showFullAddress: boolean;
    showContractors: boolean;
    showDocuments: boolean;
    showCosts: boolean;
  } | null;
  revokedAt: string | null;
}

interface PrivacySettings {
  showFullAddress: boolean;
  showContractors: boolean;
  showDocuments: boolean;
  showCosts: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  showFullAddress: false,
  showContractors: true,
  showDocuments: false,
  showCosts: false,
};

function PrivacyToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={`switch-${id}`}
      />
    </div>
  );
}

export function MasterQRDialog({ propertyId, propertyName, open, onOpenChange }: MasterQRDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFeature, isLoading: entitlementsLoading } = useEntitlements();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [showRevokedBanner, setShowRevokedBanner] = useState(false);

  const { data, isLoading } = useQuery<MasterQRResponse>({
    queryKey: [`/api/properties/${propertyId}/master-identifier`],
    enabled: open && !entitlementsLoading,
  });

  const masterIdentifier = data?.masterIdentifier || null;
  const isRevoked = !!data?.revokedAt;
  const hasMasterQRFeature = hasFeature("masterQR");
  const isLoadingState = isLoading || entitlementsLoading;

  useEffect(() => {
    if (data?.masterIdentifier && !isRevoked) {
      generateQRCode(data.masterIdentifier);
    } else {
      setQrDataUrl("");
    }
    
    if (data?.publicVisibility) {
      setPrivacySettings(data.publicVisibility);
    }
  }, [data, isRevoked]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!hasMasterQRFeature) {
        throw new Error("Master QR feature not available");
      }
      const res = await apiRequest("POST", `/api/properties/${propertyId}/master-identifier`, {
        privacySettings,
        regenerate: true, // Signal that we want to regenerate, not just update privacy
      });
      return await res.json();
    },
    onSuccess: async (responseData) => {
      toast({
        title: "Master QR Generated",
        description: "Your property's master QR code is ready",
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/master-identifier`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/homeowner"] });
      
      if (responseData?.masterIdentifier) {
        await generateQRCode(responseData.masterIdentifier);
      }
      setShowRevokedBanner(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate master QR code",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!hasMasterQRFeature) {
        throw new Error("Master QR feature not available");
      }
      const res = await apiRequest("POST", `/api/properties/${propertyId}/master-identifier/revoke`);
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Master QR Revoked",
        description: "The master QR code has been deactivated",
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/master-identifier`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/homeowner"] });
      setQrDataUrl("");
      setShowRevokedBanner(true);
    },
    onError: (error: any) => {
      toast({
        title: "Revocation Failed",
        description: error.message || "Failed to revoke master QR code",
        variant: "destructive",
      });
    },
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (newSettings: PrivacySettings) => {
      if (!hasMasterQRFeature) {
        throw new Error("Master QR feature not available");
      }
      const res = await apiRequest("POST", `/api/properties/${propertyId}/master-identifier`, {
        privacySettings: newSettings,
      });
      return await res.json();
    },
    onMutate: async (newSettings) => {
      setPrivacySettings(newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Privacy Updated",
        description: "Your privacy settings have been saved",
      });
    },
    onError: (error: any, _variables, context) => {
      if (data?.publicVisibility) {
        setPrivacySettings(data.publicVisibility);
      }
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update privacy settings",
        variant: "destructive",
      });
    },
  });

  const generateQRCode = async (code: string) => {
    try {
      const publicUrl = `${window.location.origin}/property/public/${code}`;
      const dataUrl = await QRCodeSVG.toDataURL(publicUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate QR code image:", error);
      toast({
        title: "QR Preview Error",
        description: "Could not generate QR code preview",
        variant: "destructive",
      });
    }
  };

  const copyPublicLink = () => {
    if (!masterIdentifier || !hasMasterQRFeature || entitlementsLoading) {
      toast({
        title: "Not Available",
        description: entitlementsLoading ? "Loading..." : "Master QR feature not enabled",
        variant: "destructive",
      });
      return;
    }
    
    const publicUrl = `${window.location.origin}/property/public/${masterIdentifier}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link Copied",
      description: "Public property link copied to clipboard",
    });
  };

  const downloadQR = () => {
    if (!qrDataUrl || !hasMasterQRFeature || entitlementsLoading) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${propertyName.replace(/\s+/g, "-")}-master-qr.png`;
    link.click();
  };

  const openPreview = () => {
    if (!masterIdentifier || !hasMasterQRFeature || entitlementsLoading) return;
    window.open(`/property/public/${masterIdentifier}`, "_blank");
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean) => {
    if (entitlementsLoading) return;
    
    if (!masterIdentifier) {
      setPrivacySettings({ ...privacySettings, [key]: value });
    } else {
      const newSettings = { ...privacySettings, [key]: value };
      updatePrivacyMutation.mutate(newSettings);
    }
  };

  if (entitlementsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-master-qr-loading">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Master QR Code - {propertyName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!hasMasterQRFeature) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-master-qr-locked">
          <DialogHeader>
            <DialogTitle>Homeowner Pack Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Master QR codes are available with the Homeowner Pack subscription
            </p>
            <Button onClick={() => window.location.href = "/pricing"}>
              View Pricing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-master-qr">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Master QR Code - {propertyName}
          </DialogTitle>
        </DialogHeader>

        {isLoadingState ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : showRevokedBanner || isRevoked ? (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The master QR code for this property has been revoked. Generate a new one to re-enable the public property history.
              </AlertDescription>
            </Alert>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Privacy Settings (Preview - Locked)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Privacy settings are locked while the master QR is revoked. Regenerate to modify.
              </p>
              <div className="space-y-0">
                <PrivacyToggleRow
                  id="show-address"
                  label="Show Full Address"
                  description="Display complete street address publicly"
                  checked={privacySettings.showFullAddress}
                  onCheckedChange={(checked) => handlePrivacyChange("showFullAddress", checked)}
                  disabled={true}
                />
                <PrivacyToggleRow
                  id="show-contractors"
                  label="Show Contractor Info"
                  description="Display installer contact information"
                  checked={privacySettings.showContractors}
                  onCheckedChange={(checked) => handlePrivacyChange("showContractors", checked)}
                  disabled={true}
                />
                <PrivacyToggleRow
                  id="show-documents"
                  label="Show Documents"
                  description="Display warranties and receipts"
                  checked={privacySettings.showDocuments}
                  onCheckedChange={(checked) => handlePrivacyChange("showDocuments", checked)}
                  disabled={true}
                />
                <PrivacyToggleRow
                  id="show-costs"
                  label="Show Asset Costs"
                  description="Display purchase prices"
                  checked={privacySettings.showCosts}
                  onCheckedChange={(checked) => handlePrivacyChange("showCosts", checked)}
                  disabled={true}
                />
              </div>
            </Card>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !hasMasterQRFeature || entitlementsLoading}
              className="w-full"
              size="lg"
              data-testid="button-regenerate-master-qr"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Regenerate Master QR Code
                </>
              )}
            </Button>
          </div>
        ) : masterIdentifier ? (
          <div className="space-y-6">
            {/* QR Code Display */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2">
              <div className="flex flex-col items-center gap-4">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Master QR Code"
                    className="w-64 h-64 border-4 border-white dark:border-gray-800 rounded-lg shadow-lg"
                    data-testid="img-master-qr"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center border-4 border-white dark:border-gray-800 rounded-lg shadow-lg bg-white dark:bg-gray-800">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    size="sm"
                    disabled={!qrDataUrl || entitlementsLoading}
                    data-testid="button-download-qr"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Download QR
                  </Button>
                  <Button
                    onClick={copyPublicLink}
                    variant="outline"
                    size="sm"
                    disabled={entitlementsLoading}
                    data-testid="button-copy-link"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={openPreview}
                    variant="outline"
                    size="sm"
                    disabled={entitlementsLoading}
                    data-testid="button-preview-public"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
              </div>
            </Card>

            {/* Privacy Settings */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Public Privacy Settings
                </h3>
                {updatePrivacyMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
              <div className="space-y-0">
                <PrivacyToggleRow
                  id="show-address"
                  label="Show Full Address"
                  description="Display complete street address publicly"
                  checked={privacySettings.showFullAddress}
                  onCheckedChange={(checked) => handlePrivacyChange("showFullAddress", checked)}
                  disabled={updatePrivacyMutation.isPending || !hasMasterQRFeature}
                />
                <PrivacyToggleRow
                  id="show-contractors"
                  label="Show Contractor Info"
                  description="Display installer contact information"
                  checked={privacySettings.showContractors}
                  onCheckedChange={(checked) => handlePrivacyChange("showContractors", checked)}
                  disabled={updatePrivacyMutation.isPending || !hasMasterQRFeature}
                />
                <PrivacyToggleRow
                  id="show-documents"
                  label="Show Documents"
                  description="Display warranties and receipts"
                  checked={privacySettings.showDocuments}
                  onCheckedChange={(checked) => handlePrivacyChange("showDocuments", checked)}
                  disabled={updatePrivacyMutation.isPending || !hasMasterQRFeature}
                />
                <PrivacyToggleRow
                  id="show-costs"
                  label="Show Asset Costs"
                  description="Display purchase prices"
                  checked={privacySettings.showCosts}
                  onCheckedChange={(checked) => handlePrivacyChange("showCosts", checked)}
                  disabled={updatePrivacyMutation.isPending || !hasMasterQRFeature}
                />
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-destructive/50 bg-destructive/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Revoking this QR code will invalidate all physical stickers and public links.
              </p>
              <Button
                onClick={() => revokeMutation.mutate()}
                variant="destructive"
                disabled={revokeMutation.isPending || !hasMasterQRFeature || entitlementsLoading}
                data-testid="button-revoke-qr"
              >
                {revokeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Revoke Master QR
                  </>
                )}
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* First-Run State */}
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Generate Your Master QR Code</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create a unique QR code that gives public access to your property's service history.
                  Perfect for sharing with buyers, renters, or service professionals.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center mb-4">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Privacy controls included</span>
                </div>
              </div>
            </Card>

            {/* Privacy Settings Preview */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Configure Privacy Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose what information will be visible on the public property page
              </p>
              <div className="space-y-0">
                <PrivacyToggleRow
                  id="show-address"
                  label="Show Full Address"
                  description="Display complete street address publicly"
                  checked={privacySettings.showFullAddress}
                  onCheckedChange={(checked) => handlePrivacyChange("showFullAddress", checked)}
                  disabled={entitlementsLoading}
                />
                <PrivacyToggleRow
                  id="show-contractors"
                  label="Show Contractor Info"
                  description="Display installer contact information"
                  checked={privacySettings.showContractors}
                  onCheckedChange={(checked) => handlePrivacyChange("showContractors", checked)}
                  disabled={entitlementsLoading}
                />
                <PrivacyToggleRow
                  id="show-documents"
                  label="Show Documents"
                  description="Display warranties and receipts"
                  checked={privacySettings.showDocuments}
                  onCheckedChange={(checked) => handlePrivacyChange("showDocuments", checked)}
                  disabled={entitlementsLoading}
                />
                <PrivacyToggleRow
                  id="show-costs"
                  label="Show Asset Costs"
                  description="Display purchase prices"
                  checked={privacySettings.showCosts}
                  onCheckedChange={(checked) => handlePrivacyChange("showCosts", checked)}
                  disabled={entitlementsLoading}
                />
              </div>
            </Card>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !hasMasterQRFeature || entitlementsLoading}
              className="w-full"
              size="lg"
              data-testid="button-generate-master-qr"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-5 w-5" />
                  Generate Master QR Code
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
