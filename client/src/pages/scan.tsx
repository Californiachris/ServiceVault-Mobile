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
  const [scanMode, setScanMode] = useState<'asset' | 'checkin' | null>(null); // Track which action button was clicked
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [showServiceEventDialog, setShowServiceEventDialog] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [servicePhotos, setServicePhotos] = useState<UploadedPhoto[]>([]);
  const [claimSuccess, setClaimSuccess] = useState<any>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [warrantyMode, setWarrantyMode] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check URL for code and mode parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const mode = urlParams.get('mode');
    
    if (code) {
      setScannedCode(code);
    }
    
    if (mode === 'warranty') {
      setWarrantyMode(true);
      setIsScanning(true); // Auto-open camera in warranty mode
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
    // Check if in warranty mode and code is a URL (appliance QR)
    if (warrantyMode && (code.startsWith('http://') || code.startsWith('https://'))) {
      try {
        const url = new URL(code);
        const params = new URLSearchParams(url.search);
        
        // Extract manufacturer from domain
        let manufacturer = '';
        if (url.hostname.includes('samsung')) {
          manufacturer = 'Samsung';
        } else if (url.hostname.includes('geappliances') || url.hostname.includes('ge.com')) {
          manufacturer = 'GE Appliances';
        } else if (url.hostname.includes('kitchenaid')) {
          manufacturer = 'KitchenAid';
        } else if (url.hostname.includes('whirlpool')) {
          manufacturer = 'Whirlpool';
        } else if (url.hostname.includes('lg')) {
          manufacturer = 'LG';
        } else {
          manufacturer = url.hostname;
        }
        
        // Try to extract model and serial from URL parameters
        const model = params.get('model') || params.get('modelNumber') || params.get('product') || '';
        const serial = params.get('serial') || params.get('serialNumber') || params.get('sn') || '';
        
        // Store warranty data in sessionStorage for documents page
        const warrantyData = {
          manufacturer,
          model,
          serial,
          qrUrl: code,
          scannedAt: new Date().toISOString()
        };
        
        sessionStorage.setItem('scannedWarrantyData', JSON.stringify(warrantyData));
        
        toast({
          title: "Warranty QR Scanned!",
          description: `${manufacturer} appliance detected. Redirecting...`,
        });
        
        // Redirect to documents page with warranty data
        setTimeout(() => {
          setLocation('/tools/documents?warranty=scanned');
        }, 1500);
        
        return;
      } catch (error) {
        console.error('Error parsing warranty QR URL:', error);
      }
    }
    
    // Handle contractor check-in mode
    if (scanMode === 'checkin') {
      // Store scanned code and mode for worker check-in flow
      sessionStorage.setItem('contractorCheckInCode', code);
      setLocation(`/contractor/worker-checkin?code=${encodeURIComponent(code)}`);
      return;
    }
    
    // Normal ServiceVault asset code handling (for asset logging or default scan)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 tracking-tight text-white">QR Code Scanner</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Scan QR codes to access asset information, claim unclaimed assets, or view complete property histories.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div>
            <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden transform transition-all duration-300 hover:shadow-cyan-500/20 hover:shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                    <QrCode className="h-6 w-6 text-white" />
                  </div>
                  Camera Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isScanning ? (
                  <div className="text-center space-y-8">
                    <div className="w-full aspect-square bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-2xl flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-20 w-20 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-300 mb-4 text-lg">
                          Choose an action below to scan
                        </p>
                      </div>
                    </div>
                    
                    {/* Premium Action Buttons */}
                    {user?.role === 'CONTRACTOR' && (
                      <div className="grid grid-cols-1 gap-5">
                        <Button 
                          onClick={() => {
                            setScanMode('asset');
                            setIsScanning(true);
                          }}
                          size="lg"
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-16 text-lg rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
                          data-testid="button-log-asset"
                        >
                          <Plus className="mr-3 h-6 w-6" />
                          Log New Asset
                        </Button>
                        <Button 
                          onClick={() => {
                            setScanMode('checkin');
                            setIsScanning(true);
                          }}
                          size="lg"
                          variant="outline"
                          className="border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white font-bold h-16 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform hover:border-cyan-500/50"
                          data-testid="button-check-in-out"
                        >
                          <QrCode className="mr-3 h-6 w-6" />
                          Check In / Check Out
                        </Button>
                      </div>
                    )}
                    
                    {user?.role !== 'CONTRACTOR' && (
                      <Button 
                        onClick={() => setIsScanning(true)}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
                        data-testid="button-start-scanning"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Start Scanning
                      </Button>
                    )}
                  </div>
                ) : (
                  <QRScanner 
                    onScan={handleScan} 
                    onClose={() => {
                      setIsScanning(false);
                      setScanMode(null);
                    }}
                    onStatusChange={handleCameraStatusChange}
                    onFallbackRequest={handleFallbackRequest}
                  />
                )}

                {/* Manual Code Input */}
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <p className="text-sm text-slate-300 mb-3 font-medium">Or enter code manually:</p>
                  <div className="flex gap-2">
                    <input
                      ref={manualInputRef}
                      type="text"
                      placeholder="Enter QR code (e.g., FT-HVAC-2024-A7K9)"
                      className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-xl shadow-lg transition-all duration-200"
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
            <Card className="mt-6 bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <History className="h-6 w-6" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentScans.map((scan, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/30 rounded-2xl hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200 hover:scale-[1.01] cursor-pointer backdrop-blur-xl shadow-lg hover:shadow-xl hover:shadow-cyan-500/10"
                      onClick={() => setScannedCode(scan.code)}
                      data-testid={`recent-scan-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal-500/20 to-cyan-600/20 rounded-xl border border-teal-500/30 shadow-lg">
                          {scan.type === 'MASTER' ? (
                            <Home className="h-4 w-4 text-teal-400" />
                          ) : (
                            <Wrench className="h-4 w-4 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{scan.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{scan.code}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={scan.claimed ? "default" : "secondary"}>
                          {scan.claimed ? "Claimed" : "Available"}
                        </Badge>
                        <span className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"></span>
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
              <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <QrCode className="h-6 w-6" />
                    Scan Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scanLoading ? (
                    <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-2xl backdrop-blur-xl shadow-xl">
                      <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-6 shadow-lg shadow-cyan-500/30" />
                      <p className="text-slate-300 text-lg font-medium">Looking up QR code...</p>
                    </div>
                  ) : scanError ? (
                    <div className="text-center py-12 bg-slate-900/80 border border-slate-700/50 rounded-3xl backdrop-blur-xl shadow-2xl shadow-red-500/10">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full inline-flex items-center justify-center mb-6 shadow-lg">
                        <AlertCircle className="h-16 w-16 text-red-400" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">QR Code Not Found</h3>
                      <p className="text-slate-300 mb-6 max-w-md mx-auto">
                        The scanned QR code "<span className="font-mono text-cyan-400">{scannedCode}</span>" was not found in our system.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setScannedCode(null)}
                        className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                        data-testid="button-scan-another"
                      >
                        Scan Another Code
                      </Button>
                    </div>
                  ) : scanResult ? (
                    <div className="space-y-4">
                      {/* Success State */}
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-green-500/10">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl mr-3 shadow-lg">
                            <CheckCircle2 className="text-green-400 h-6 w-6" />
                          </div>
                          <span className="font-bold text-green-400 text-lg">QR Code Detected</span>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                            <span className="text-slate-400 font-medium">Code:</span>
                            <span className="font-mono text-cyan-400 font-semibold">{scanResult.code}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                            <span className="text-slate-400 font-medium">Type:</span>
                            <Badge variant="outline" className="border-teal-500/50 text-teal-400">
                              {scanResult.type === 'HOUSE' ? 'Property Master' : 'Asset'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                            <span className="text-slate-400 font-medium">Brand:</span>
                            <span className="text-white font-semibold">{scanResult.brandLabel || 'ServiceVault'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                            <span className="text-slate-400 font-medium">Status:</span>
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
                            <div className="space-y-4 pt-6 border-t border-slate-700/50">
                              <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                <div className="p-2 bg-gradient-to-br from-teal-500/20 to-cyan-600/20 rounded-xl">
                                  <ImageIcon className="h-5 w-5 text-cyan-400" />
                                </div>
                                Installation Photos (Optional)
                              </h3>
                              <p className="text-sm text-slate-300">
                                Upload up to 5 photos of the installation
                              </p>

                              {/* Photo Previews */}
                              {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                  {photos.map((photo) => (
                                    <div key={photo.id} className="relative group bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg">
                                      <img
                                        src={photo.preview}
                                        alt="Installation photo"
                                        className="w-full h-24 object-cover"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-xl shadow-lg backdrop-blur-sm"
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
                                      className="w-full bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
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
                                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
                                disabled={claimMutation.isPending}
                                data-testid="button-submit-install"
                              >
                                {claimMutation.isPending ? (
                                  <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
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
                                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform" 
                                  onClick={handleClaimAsset}
                                  data-testid="button-claim-asset"
                                >
                                  <Link className="mr-2 h-4 w-4" />
                                  Claim & Bind {scanResult.type === 'HOUSE' ? 'Property' : 'Asset'}
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform" 
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
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform" 
                                onClick={() => setLocation(`/property/${scanResult.property!.id}`)}
                                data-testid="button-view-property"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Property History
                              </Button>
                            ) : scanResult.asset && (
                              <Button 
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform" 
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
                                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform" 
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
                          <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-green-500/20">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-full inline-flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                              <CheckCircle2 className="h-16 w-16 text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Installation Complete!</h3>
                            <p className="text-slate-300 mb-6 text-lg">
                              The asset has been successfully claimed and bound to your property.
                            </p>
                            
                            {claimSuccess && (
                              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-sm space-y-3 text-left backdrop-blur-xl shadow-xl">
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                  <span className="text-slate-400 font-medium">Asset:</span>
                                  <span className="font-semibold text-white">{claimSuccess.asset?.name}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                  <span className="text-slate-400 font-medium">Property:</span>
                                  <span className="font-semibold text-white">{claimSuccess.property?.name}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                  <span className="text-slate-400 font-medium">Category:</span>
                                  <Badge variant="outline" className="border-teal-500/50 text-teal-400">{claimSuccess.asset?.category}</Badge>
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
                              className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
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
                      <div className="text-sm text-slate-300 p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl backdrop-blur-xl shadow-xl">
                        {scanResult.type === 'HOUSE' ? (
                          <p className="leading-relaxed">This is a master property code that provides access to the complete property history, including all infrastructure assets, installation records, and service history.</p>
                        ) : (
                          <p className="leading-relaxed">This is an asset identifier that tracks the complete lifecycle of a specific item including installation, service, warranties, and transfers.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {!scannedCode && (
              <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl rounded-3xl">
                <CardContent className="pt-6">
                  <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-2xl backdrop-blur-xl shadow-xl">
                    <div className="p-6 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full inline-flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/30">
                      <QrCode className="h-16 w-16 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight text-white">Ready to Scan</h3>
                    <p className="text-slate-300 text-lg">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">Log Service Event</DialogTitle>
            <DialogDescription className="text-slate-300 text-base">
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
              <div className="space-y-4">
                <label className="text-sm font-semibold text-white">Service Photos (optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  {servicePhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg">
                      <img
                        src={photo.preview}
                        alt="Service photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeServicePhoto(photo.id)}
                        className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        data-testid={`button-remove-service-photo-${photo.id}`}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {servicePhotos.length < 5 && (
                    <label className="aspect-square border-2 border-dashed border-slate-600 bg-slate-800/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-cyan-500/50 transition-all duration-200 backdrop-blur-xl shadow-lg">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleServicePhotoSelect}
                        className="hidden"
                        data-testid="input-service-photos"
                      />
                      <ImageIcon className="h-10 w-10 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-400 font-medium">Add Photo</span>
                    </label>
                  )}
                </div>
                <p className="text-sm text-slate-400">
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
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
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
