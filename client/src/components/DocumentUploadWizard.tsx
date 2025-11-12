import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, CheckCircle2, AlertCircle, X, Shield, FileText, Receipt, BookOpen, Clipboard, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

const DOCUMENT_TYPES = [
  { value: 'RECEIPT', label: 'Receipt', icon: Receipt },
  { value: 'WARRANTY', label: 'Warranty', icon: Shield },
  { value: 'MANUAL', label: 'Manual', icon: BookOpen },
  { value: 'INSPECTION', label: 'Inspection Report', icon: Clipboard },
  { value: 'QUOTE', label: 'Quote', icon: DollarSign },
  { value: 'INVOICE', label: 'Invoice', icon: DollarSign },
  { value: 'OTHER', label: 'Other', icon: FileText },
];

interface DocumentUploadWizardProps {
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  buttonClassName?: string;
  children: ReactNode;
  scannedWarrantyData?: {
    manufacturer?: string;
    model?: string;
    serial?: string;
    qrUrl?: string;
  } | null;
}

type WizardStep = 'upload' | 'metadata' | 'success';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  uploadURL?: string;
  error?: string;
}

export function DocumentUploadWizard({
  maxFileSize = 52428800, // 50MB
  acceptedFileTypes = ['*/*'],
  onGetUploadParameters,
  buttonClassName,
  children,
  scannedWarrantyData,
}: DocumentUploadWizardProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [uploadFile, setUploadFile] = useState<UploadFile | null>(null);
  const { toast } = useToast();

  // Metadata state
  const [documentType, setDocumentType] = useState('WARRANTY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [propertyId, setPropertyId] = useState('');

  // Fetch user's properties and assets
  const { data: dashboardData } = useQuery<{
    properties: Array<{
      id: string;
      name: string;
      assets: Array<{
        id: string;
        name: string;
        category: string;
      }>;
    }>;
  }>({
    queryKey: ['/api/dashboard/homeowner'],
    enabled: showModal, // Only fetch when modal is open
  });

  // Initialize metadata from scanned warranty data when modal opens
  useEffect(() => {
    if (showModal && scannedWarrantyData) {
      // Auto-populate title with manufacturer and model
      const autoTitle = `${scannedWarrantyData.manufacturer || ''} ${scannedWarrantyData.model || ''} Warranty`.trim();
      if (autoTitle !== 'Warranty') {
        setTitle(autoTitle);
      }
      
      // Auto-populate description with scanned details
      const autoDescription = `Model: ${scannedWarrantyData.model || 'N/A'}\nSerial: ${scannedWarrantyData.serial || 'N/A'}\n\nScanned from appliance QR code`;
      setDescription(autoDescription);
      
      // Set document type to WARRANTY
      setDocumentType('WARRANTY');
    }
  }, [showModal, scannedWarrantyData]);

  // Auto-advance to metadata if file is already uploaded (fixes Back button issue)
  useEffect(() => {
    if (currentStep === 'upload' && uploadFile?.status === 'success') {
      console.log('[DocumentUploadWizard] File already uploaded, auto-advancing to metadata');
      setCurrentStep('metadata');
    }
  }, [currentStep, uploadFile]);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File exceeds the maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    // Auto-populate title from filename
    setTitle(file.name.replace(/\.[^/.]+$/, ""));

    console.log('[DocumentUploadWizard] File selected, starting immediate upload:', file.name);

    // Immediately start upload - don't wait for state
    try {
      // Set initial state
      setUploadFile({
        file,
        progress: 0,
        status: 'uploading',
      });

      // Get upload parameters
      console.log('[DocumentUploadWizard] Getting upload parameters...');
      const { url } = await onGetUploadParameters();
      console.log('[DocumentUploadWizard] Got upload URL, uploading file...');

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            console.log(`[DocumentUploadWizard] Upload progress: ${progress}%`);
            setUploadFile(prev => prev ? { ...prev, progress, uploadURL: url } : null);
          }
        });

        xhr.addEventListener('load', () => {
          console.log(`[DocumentUploadWizard] Upload complete, status: ${xhr.status}`);
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadFile({ file, progress: 100, status: 'success', uploadURL: url });
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[DocumentUploadWizard] XHR error during upload');
          reject(new Error('Network error during upload'));
        });

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Move to metadata step
      console.log('[DocumentUploadWizard] Upload successful, moving to metadata step');
      setCurrentStep('metadata');

      toast({
        title: "File uploaded",
        description: "Now add document details below",
      });

    } catch (error) {
      console.error('[DocumentUploadWizard] Upload error:', error);
      
      setUploadFile({
        file,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "File upload failed. Please try again.",
        variant: "destructive",
      });
    }
  };


  const saveMutation = useMutation({
    mutationFn: async (variables?: { assetId?: string; propertyId?: string }) => {
      if (!uploadFile?.uploadURL) throw new Error("No file uploaded");

      const payload: any = {
        assetId: variables?.assetId || assetId || undefined,
        propertyId: variables?.propertyId || propertyId || undefined,
        type: documentType,
        title: title || uploadFile.file.name,
        description: description || undefined,
        objectPath: uploadFile.uploadURL,
      };

      if (scannedWarrantyData) {
        payload.scannedWarrantyMetadata = scannedWarrantyData;
      }

      const response = await apiRequest("POST", "/api/documents/upload", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setCurrentStep('success');
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save document",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!title) {
      toast({
        title: "Missing Title",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    // If no asset or property selected, auto-select first property
    let finalAssetId = assetId;
    let finalPropertyId = propertyId;
    
    if (!finalAssetId && !finalPropertyId && dashboardData?.properties.length) {
      finalPropertyId = dashboardData.properties[0].id;
      console.log(`[DocumentUploadWizard] No selection, auto-selecting property: ${finalPropertyId}`);
    }

    // Pass computed values directly to mutation (avoids async state update issues)
    saveMutation.mutate({ assetId: finalAssetId, propertyId: finalPropertyId });
  };

  const resetAndClose = () => {
    setUploadFile(null);
    setCurrentStep('upload');
    setTitle('');
    setDescription('');
    setAssetId('');
    setPropertyId('');
    setDocumentType('WARRANTY');
    setShowModal(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={buttonClassName}
        data-testid="button-open-upload-wizard"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </DialogTitle>
            <DialogDescription>
              {currentStep === 'upload' && `Step 1 of 2: Upload your file`}
              {currentStep === 'metadata' && `Step 2 of 2: Add document details`}
              {currentStep === 'success' && `Document saved successfully`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pb-4">
            {/* Step 1: Upload File */}
            {currentStep === 'upload' && (
              <>
                <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors relative">
                  <CardContent className="pt-6">
                    <div className="text-center relative">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Choose file to upload</p>
                        <p className="text-xs text-muted-foreground">
                          Max {Math.round(maxFileSize / 1024 / 1024)}MB
                        </p>
                      </div>
                      {!uploadFile && (
                        <input
                          type="file"
                          accept={acceptedFileTypes.join(',')}
                          onChange={(e) => handleFileSelect(e.target.files)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          data-testid="input-file-select"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {uploadFile && (
                  <Card className="p-3">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                          {uploadFile.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {uploadFile.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatFileSize(uploadFile.file.size)}</span>
                          <span className="font-medium">
                            {uploadFile.status === 'pending' && '✓ Ready to Upload'}
                            {uploadFile.status === 'uploading' && 'Uploading...'}
                            {uploadFile.status === 'success' && '✓ Upload Complete'}
                            {uploadFile.status === 'error' && '✗ Upload Failed'}
                          </span>
                        </div>
                        {uploadFile.status === 'uploading' && <Progress value={uploadFile.progress} className="h-1" />}
                        {uploadFile.error && <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>}
                      </div>
                    </div>
                  </Card>
                )}

                {uploadFile && uploadFile.status === 'uploading' && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Uploading file, please wait...</p>
                  </div>
                )}
                
                {uploadFile && uploadFile.status === 'error' && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={resetAndClose}>Close</Button>
                  </div>
                )}
                
                {!uploadFile && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Add Metadata */}
            {currentStep === 'metadata' && (
              <>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">{uploadFile?.file.name}</span> uploaded successfully
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Water Heater Warranty"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Property (Optional)</Label>
                    <Select 
                      value={propertyId} 
                      onValueChange={(value) => {
                        setPropertyId(value);
                        setAssetId(''); // Clear asset when property changes
                      }}
                    >
                      <SelectTrigger id="propertyId">
                        <SelectValue placeholder="Select a property or leave blank for default" />
                      </SelectTrigger>
                      <SelectContent>
                        {dashboardData?.properties.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Link to entire property (optional)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetId">Asset (Optional)</Label>
                    <Select 
                      value={assetId} 
                      onValueChange={setAssetId}
                      disabled={!propertyId}
                    >
                      <SelectTrigger id="assetId">
                        <SelectValue placeholder={propertyId ? "Select a specific asset" : "Select a property first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyId && dashboardData?.properties
                          .find(p => p.id === propertyId)
                          ?.assets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name} ({asset.category})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Link to a specific asset (optional)</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Reset to start fresh upload
                      setUploadFile(null);
                      setCurrentStep('upload');
                      setTitle('');
                      setDescription('');
                    }}
                  >
                    Choose Different File
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Save Document
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {currentStep === 'success' && (
              <>
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Document Saved!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your document has been uploaded and linked successfully
                  </p>
                </div>

                <Button onClick={resetAndClose} className="w-full">Done</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
