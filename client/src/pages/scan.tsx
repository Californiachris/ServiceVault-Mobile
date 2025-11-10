import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QRScanner, { CameraStatus } from "@/components/scanner/qr-scanner";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  QrCode, 
  CheckCircle2, 
  Link, 
  History, 
  Camera,
  AlertCircle,
  Home,
  Wrench,
  Upload,
  Eye,
  FileText,
  CalendarIcon,
  X,
  ImageIcon,
  Plus
} from "lucide-react";

// Form schema for install workflow
const installFormSchema = z.object({
  assetName: z.string().min(1, "Asset name is required"),
  category: z.enum(["PLUMBING", "HVAC", "ELECTRICAL", "ROOFING", "APPLIANCE", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  installDate: z.date(),
  installerNotes: z.string().optional(),
  propertyId: z.string().min(1, "Property is required"),
  // New property fields (when creating new)
  newPropertyName: z.string().optional(),
  newPropertyAddress: z.string().optional(),
  newPropertyCity: z.string().optional(),
  newPropertyState: z.string().optional(),
  newPropertyZip: z.string().optional(),
}).refine((data) => {
  // If creating a new property, require name and address
  if (data.propertyId === "new") {
    return !!data.newPropertyName && !!data.newPropertyAddress;
  }
  return true;
}, {
  message: "Property name and address are required when creating a new property",
  path: ["newPropertyName"],
});

type InstallFormData = z.infer<typeof installFormSchema>;

// Service event form schema
const serviceEventSchema = z.object({
  eventType: z.enum(["SERVICE", "REPAIR", "INSPECTION", "WARRANTY", "NOTE"]),
  notes: z.string().min(1, "Notes are required"),
});

type ServiceEventFormData = z.infer<typeof serviceEventSchema>;

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  uploadURL?: string;
  uploading: boolean;
  progress: number;
}

export default function Scan() {
  const [, setLocation] = useLocation();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [showServiceEventDialog, setShowServiceEventDialog] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [servicePhotos, setServicePhotos] = useState<UploadedPhoto[]>([]);
  const [claimSuccess, setClaimSuccess] = useState<any>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check URL for code parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setScannedCode(code);
    }
  }, []);

  const { data: scanResult, isLoading: scanLoading, error: scanError } = useQuery<{
    code: string;
    type: 'HOUSE' | 'ASSET';
    brandLabel?: string;
    claimed: boolean;
    asset?: {
      id: string;
      name: string;
      category: string;
      brand?: string;
      model?: string;
      installedAt?: string;
      status: string;
    };
    property?: {
      id: string;
    };
  }>({
    queryKey: ["/api/scan", scannedCode],
    enabled: !!scannedCode,
    retry: false,
  });

  // Initialize form
  const form = useForm<InstallFormData>({
    resolver: zodResolver(installFormSchema),
    defaultValues: {
      assetName: "",
      category: "OTHER",
      brand: "",
      model: "",
      serial: "",
      installDate: new Date(),
      installerNotes: "",
      propertyId: "",
      newPropertyName: "",
      newPropertyAddress: "",
      newPropertyCity: "",
      newPropertyState: "",
      newPropertyZip: "",
    },
  });

  // Fetch user's properties
  const { data: properties = [] } = useQuery<Array<{ id: string; name: string; addressLine1?: string }>>({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated && showInstallForm,
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async (data: InstallFormData) => {
      // Upload photos first
      const photoUrls: string[] = [];
      for (const photo of photos) {
        if (!photo.uploadURL) {
          // Get upload URL
          const uploadRes = await apiRequest("POST", "/api/objects/upload");
          const { uploadURL } = await uploadRes.json();
          
          // Upload file
          await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": photo.file.type },
            body: photo.file,
          });
          
          // Extract path from uploadURL
          const url = new URL(uploadURL);
          photoUrls.push(url.pathname);
        }
      }

      // Prepare asset data
      const assetData = {
        name: data.assetName,
        category: data.category,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        installedAt: data.installDate,
        notes: data.installerNotes,
      };

      // Prepare property data
      let propertyData: any = null;
      if (data.propertyId === "new") {
        propertyData = {
          name: data.newPropertyName,
          addressLine1: data.newPropertyAddress,
          city: data.newPropertyCity,
          state: data.newPropertyState,
          postalCode: data.newPropertyZip,
        };
      } else {
        propertyData = { id: data.propertyId };
      }

      // Submit claim
      const res = await apiRequest("POST", "/api/identifiers/claim", {
        code: scannedCode,
        asset: assetData,
        property: propertyData,
        photos: photoUrls,
      });

      return res.json();
    },
    onSuccess: (data) => {
      setClaimSuccess(data);
      setShowInstallForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Asset claimed successfully!",
        description: "The asset has been bound and installation recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to claim asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Service event form
  const serviceEventForm = useForm<ServiceEventFormData>({
    resolver: zodResolver(serviceEventSchema),
    defaultValues: {
      eventType: "SERVICE",
      notes: "",
    },
  });

  // Service event mutation
  const serviceEventMutation = useMutation({
    mutationFn: async (data: ServiceEventFormData) => {
      if (!scanResult?.asset?.id) {
        throw new Error("No asset ID found");
      }

      // Upload service photos first
      const photoUrls: string[] = [];
      for (const photo of servicePhotos) {
        if (!photo.uploadURL) {
          const uploadRes = await apiRequest("POST", "/api/objects/upload");
          const { uploadURL } = await uploadRes.json();
          
          await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": photo.file.type },
            body: photo.file,
          });
          
          const url = new URL(uploadURL);
          photoUrls.push(url.pathname);
        }
      }

      // Create service event
      const res = await apiRequest("POST", `/api/assets/${scanResult.asset.id}/events`, {
        type: data.eventType,
        note: data.notes,
        photos: photoUrls,
      });

      return res.json();
    },
    onSuccess: () => {
      setShowServiceEventDialog(false);
      setServicePhotos([]);
      serviceEventForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/public/asset/${scanResult?.asset?.id}`] });
      toast({
        title: "Service event logged!",
        description: "The event has been added to the asset history.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log service event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = (code: string) => {
    setScannedCode(code);
    setIsScanning(false);
    setShowInstallForm(false);
    setClaimSuccess(null);
  };

  const handleClaimAsset = () => {
    setShowInstallForm(true);
    setClaimSuccess(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: UploadedPhoto[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
      const file = files[i];
      newPhotos.push({
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        progress: 0,
      });
    }

    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const handleServicePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: UploadedPhoto[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - servicePhotos.length); i++) {
      const file = files[i];
      newPhotos.push({
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        progress: 0,
      });
    }

    setServicePhotos([...servicePhotos, ...newPhotos]);
  };

  const removeServicePhoto = (id: string) => {
    setServicePhotos(servicePhotos.filter(p => p.id !== id));
  };

  const onSubmit = (data: InstallFormData) => {
    claimMutation.mutate(data);
  };

  const onServiceEventSubmit = (data: ServiceEventFormData) => {
    serviceEventMutation.mutate(data);
  };

  const handleCameraStatusChange = (status: CameraStatus, message?: string) => {
    setCameraStatus(status);
    
    if (status === 'blocked') {
      toast({
        title: "Camera Blocked",
        description: "Open this page in a new tab to use the camera scanner.",
        variant: "destructive",
      });
    } else if (status === 'denied') {
      toast({
        title: "Camera Permission Denied",
        description: "Please allow camera access in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const handleFallbackRequest = () => {
    manualInputRef.current?.focus();
  };

  const recentScans = [
    { code: "FT-PLUMB-2024-B3M7", name: "Water Heater", type: "ASSET", claimed: true },
    { code: "FT-HVAC-2024-A7K9", name: "HVAC Unit", type: "ASSET", claimed: true },
    { code: "FT-ELEC-2024-C5N2", name: "Electrical Panel", type: "ASSET", claimed: false },
  ];

  return (
    <div className="bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">QR Code Scanner</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scan QR codes to access asset information, claim unclaimed assets, or view complete property histories.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Camera Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isScanning ? (
                  <div className="text-center space-y-4">
                    <div className="w-full aspect-square bg-muted/20 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Click to activate camera and scan QR codes
                        </p>
                        <Button 
                          onClick={() => setIsScanning(true)}
                          data-testid="button-start-scanning"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Start Scanning
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <QRScanner 
                    onScan={handleScan} 
                    onClose={() => setIsScanning(false)}
                    onStatusChange={handleCameraStatusChange}
                    onFallbackRequest={handleFallbackRequest}
                  />
                )}

                {/* Manual Code Input */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Or enter code manually:</p>
                  <div className="flex gap-2">
                    <input
                      ref={manualInputRef}
                      type="text"
                      placeholder="Enter QR code (e.g., FT-HVAC-2024-A7K9)"
                      className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            setScannedCode(value);
                          }
                        }
                      }}
                      data-testid="input-manual-code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentScans.map((scan, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setScannedCode(scan.code)}
                      data-testid={`recent-scan-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {scan.type === 'MASTER' ? (
                            <Home className="h-4 w-4 text-primary" />
                          ) : (
                            <Wrench className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{scan.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{scan.code}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={scan.claimed ? "default" : "secondary"}>
                          {scan.claimed ? "Claimed" : "Available"}
                        </Badge>
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {scannedCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Scan Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scanLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-muted-foreground">Looking up QR code...</p>
                    </div>
                  ) : scanError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">QR Code Not Found</h3>
                      <p className="text-muted-foreground mb-4">
                        The scanned QR code "{scannedCode}" was not found in our system.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setScannedCode(null)}
                        data-testid="button-scan-another"
                      >
                        Scan Another Code
                      </Button>
                    </div>
                  ) : scanResult ? (
                    <div className="space-y-4">
                      {/* Success State */}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle2 className="text-green-400 mr-2 h-5 w-5" />
                          <span className="font-medium text-green-400">QR Code Detected</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Code:</span>
                            <span className="font-mono">{scanResult.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <Badge variant="outline">
                              {scanResult.type === 'HOUSE' ? 'Property Master' : 'Asset'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Brand:</span>
                            <span>{scanResult.brandLabel || 'Fix-Track'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={scanResult.claimed ? "default" : "secondary"}>
                              {scanResult.claimed ? 'Claimed' : 'Available'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Install Form or Action Buttons */}
                      {!scanResult.claimed && !claimSuccess && showInstallForm ? (
                        /* Install Workflow Form */
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Asset Information Section */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold">Asset Information</h3>
                              
                              <FormField
                                control={form.control}
                                name="assetName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Asset Name *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="e.g., Water Heater, HVAC Unit" 
                                        data-testid="input-asset-name"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-category">
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="PLUMBING">Plumbing</SelectItem>
                                        <SelectItem value="HVAC">HVAC</SelectItem>
                                        <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                                        <SelectItem value="ROOFING">Roofing</SelectItem>
                                        <SelectItem value="APPLIANCE">Appliance</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="brand"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Brand</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="e.g., Rheem, Carrier" 
                                          data-testid="input-brand"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="model"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Model</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="Model number" 
                                          data-testid="input-model"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name="serial"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Serial Number</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Serial number" 
                                        data-testid="input-serial"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="installDate"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Install Date *</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className="w-full pl-3 text-left font-normal"
                                            data-testid="button-install-date"
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) =>
                                            date > new Date() || date < new Date("1900-01-01")
                                          }
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="installerNotes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Installer Notes</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Installation details, warranty info, special notes..." 
                                        className="min-h-[100px]"
                                        data-testid="textarea-installer-notes"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Any important details about the installation
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Property Selection Section */}
                            <div className="space-y-4 pt-4 border-t">
                              <h3 className="text-lg font-semibold">Property</h3>
                              
                              <FormField
                                control={form.control}
                                name="propertyId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Select Property *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-property">
                                          <SelectValue placeholder="Select property" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {properties.map((property) => (
                                          <SelectItem key={property.id} value={property.id}>
                                            {property.name}
                                            {property.addressLine1 && ` - ${property.addressLine1}`}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="new">
                                          <div className="flex items-center">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create New Property
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* New Property Fields (shown when "new" is selected) */}
                              {form.watch("propertyId") === "new" && (
                                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                                  <FormField
                                    control={form.control}
                                    name="newPropertyName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Property Name *</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="e.g., Main Street Residence" 
                                            data-testid="input-new-property-name"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="newPropertyAddress"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Address *</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="Street address" 
                                            data-testid="input-new-property-address"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="newPropertyCity"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>City</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="City" 
                                              data-testid="input-new-property-city"
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="newPropertyState"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>State</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="State" 
                                              data-testid="input-new-property-state"
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="newPropertyZip"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>ZIP</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="ZIP" 
                                              data-testid="input-new-property-zip"
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Photo Upload Section */}
                            <div className="space-y-4 pt-4 border-t">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Installation Photos (Optional)
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Upload up to 5 photos of the installation
                              </p>

                              {/* Photo Previews */}
                              {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-4">
                                  {photos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                      <img
                                        src={photo.preview}
                                        alt="Installation photo"
                                        className="w-full h-24 object-cover rounded-lg border"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removePhoto(photo.id)}
                                        data-testid={`button-remove-photo-${photo.id}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Upload Button */}
                              {photos.length < 5 && (
                                <div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                    id="photo-upload"
                                    data-testid="input-photo-upload"
                                  />
                                  <label htmlFor="photo-upload">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => document.getElementById('photo-upload')?.click()}
                                      data-testid="button-add-photos"
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      Add Photos ({photos.length}/5)
                                    </Button>
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowInstallForm(false);
                                  setPhotos([]);
                                  form.reset();
                                }}
                                disabled={claimMutation.isPending}
                                data-testid="button-cancel-install"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1"
                                disabled={claimMutation.isPending}
                                data-testid="button-submit-install"
                              >
                                {claimMutation.isPending ? (
                                  <>
                                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Complete Installation
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      ) : !claimSuccess ? (
                        /* Action Buttons */
                        <div className="space-y-2">
                          {!scanResult.claimed ? (
                            <>
                              {isAuthenticated ? (
                                <Button 
                                  className="w-full" 
                                  onClick={handleClaimAsset}
                                  data-testid="button-claim-asset"
                                >
                                  <Link className="mr-2 h-4 w-4" />
                                  Claim & Bind {scanResult.type === 'HOUSE' ? 'Property' : 'Asset'}
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full" 
                                  onClick={() => setLocation('/pricing')}
                                  data-testid="button-sign-up"
                                >
                                  <Link className="mr-2 h-4 w-4" />
                                  Sign Up to Claim
                                </Button>
                              )}
                            </>
                          ) : (
                          <>
                            {/* Primary Action: View Property or Asset Timeline (for everyone) */}
                            {scanResult.property && scanResult.type === 'HOUSE' ? (
                              <Button 
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" 
                                onClick={() => setLocation(`/property/${scanResult.property!.id}`)}
                                data-testid="button-view-property"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Property History
                              </Button>
                            ) : scanResult.asset && (
                              <Button 
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" 
                                onClick={() => setLocation(`/asset/${scanResult.asset!.id}`)}
                                data-testid="button-view-asset"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Complete History
                              </Button>
                            )}

                            {/* Secondary Actions (role-specific) */}
                            {isAuthenticated && user && (
                              <>
                                {user.role === 'CONTRACTOR' && (
                                  <>
                                    <Button 
                                      variant="outline"
                                      className="w-full" 
                                      onClick={() => setShowServiceEventDialog(true)}
                                      data-testid="button-log-service"
                                    >
                                      <Wrench className="mr-2 h-4 w-4" />
                                      Log Service Event
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="w-full" 
                                      onClick={() => setLocation(`/tools/documents`)}
                                      data-testid="button-upload-photo"
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload Service Photos
                                    </Button>
                                  </>
                                )}
                                {user.role === 'HOMEOWNER' && (
                                  <Button 
                                    variant="outline"
                                    className="w-full" 
                                    onClick={() => setLocation(`/tools/documents`)}
                                    data-testid="button-upload-receipt"
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Warranty/Receipt
                                  </Button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setScannedCode(null)}
                          data-testid="button-scan-another-code"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          Scan Another Code
                        </Button>
                      </div>
                      ) : (
                        /* Success State */
                        <div className="space-y-4">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
                            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Installation Complete!</h3>
                            <p className="text-muted-foreground mb-4">
                              The asset has been successfully claimed and bound to your property.
                            </p>
                            
                            {claimSuccess && (
                              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2 text-left">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Asset:</span>
                                  <span className="font-medium">{claimSuccess.asset?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Property:</span>
                                  <span className="font-medium">{claimSuccess.property?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Category:</span>
                                  <Badge variant="outline">{claimSuccess.asset?.category}</Badge>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setScannedCode(null);
                                setClaimSuccess(null);
                                setPhotos([]);
                                form.reset();
                              }}
                              data-testid="button-scan-another-success"
                            >
                              <QrCode className="mr-2 h-4 w-4" />
                              Scan Another
                            </Button>
                            <Button 
                              className="flex-1"
                              onClick={() => {
                                if (claimSuccess?.asset?.id) {
                                  setLocation(`/tools/assets?id=${claimSuccess.asset.id}`);
                                }
                              }}
                              data-testid="button-view-asset"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Asset
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Information */}
                      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                        {scanResult.type === 'HOUSE' ? (
                          <p>This is a master property code that provides access to the complete property history, including all infrastructure assets, installation records, and service history.</p>
                        ) : (
                          <p>This is an asset identifier that tracks the complete lifecycle of a specific item including installation, service, warranties, and transfers.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {!scannedCode && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                    <p className="text-muted-foreground">
                      Scan a QR code using the camera or enter a code manually to get started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Service Event Dialog */}
      <Dialog open={showServiceEventDialog} onOpenChange={setShowServiceEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Service Event</DialogTitle>
            <DialogDescription>
              Record a service or repair event for this asset
            </DialogDescription>
          </DialogHeader>

          <Form {...serviceEventForm}>
            <form onSubmit={serviceEventForm.handleSubmit(onServiceEventSubmit)} className="space-y-6">
              {/* Event Type */}
              <FormField
                control={serviceEventForm.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SERVICE">Service / Maintenance</SelectItem>
                        <SelectItem value="REPAIR">Repair</SelectItem>
                        <SelectItem value="INSPECTION">Inspection</SelectItem>
                        <SelectItem value="WARRANTY">Warranty Claim</SelectItem>
                        <SelectItem value="NOTE">General Note</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={serviceEventForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the work performed, parts replaced, issues found..." 
                        className="min-h-[120px]"
                        data-testid="textarea-service-notes"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed notes about the service event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photos */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Photos (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {servicePhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square">
                      <img
                        src={photo.preview}
                        alt="Service photo"
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeServicePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full"
                        data-testid={`button-remove-service-photo-${photo.id}`}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {servicePhotos.length < 5 && (
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleServicePhotoSelect}
                        className="hidden"
                        data-testid="input-service-photos"
                      />
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload up to 5 photos ({servicePhotos.length}/5)
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowServiceEventDialog(false);
                    setServicePhotos([]);
                    serviceEventForm.reset();
                  }}
                  data-testid="button-cancel-service-event"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={serviceEventMutation.isPending}
                  data-testid="button-submit-service-event"
                >
                  {serviceEventMutation.isPending ? "Logging..." : "Log Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
