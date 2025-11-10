import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Receipt, Shield, BookOpen, Clipboard, DollarSign, AlertCircle } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: 'RECEIPT', label: 'Receipt', icon: Receipt },
  { value: 'WARRANTY', label: 'Warranty', icon: Shield },
  { value: 'MANUAL', label: 'Manual', icon: BookOpen },
  { value: 'INSPECTION', label: 'Inspection Report', icon: Clipboard },
  { value: 'QUOTE', label: 'Quote', icon: DollarSign },
  { value: 'INVOICE', label: 'Invoice', icon: DollarSign },
  { value: 'OTHER', label: 'Other', icon: FileText },
];

export default function DocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [assetId, setAssetId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [documentType, setDocumentType] = useState('WARRANTY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ uploadURL: string; name: string }>>([]);

  const uploadMutation = useMutation({
    mutationFn: async (objectPath: string) => {
      const response = await apiRequest("POST", "/api/documents/upload", {
        assetId: assetId || undefined,
        propertyId: propertyId || undefined,
        type: documentType,
        title: title || uploadedFiles[0]?.name || 'Document',
        objectPath,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been successfully uploaded and linked",
      });
      // Reset form
      setAssetId('');
      setPropertyId('');
      setDocumentType('WARRANTY');
      setTitle('');
      setDescription('');
      setUploadedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: { successful: Array<{ uploadURL: string; name: string }> }) => {
    if (result.successful.length > 0) {
      const file = result.successful[0];
      setUploadedFiles([file]);
      
      // Auto-set title if not already set
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension
      }
      
      toast({
        title: "File Uploaded",
        description: "File uploaded successfully. Complete the form to save the document.",
      });
    }
  };

  const handleSaveDocument = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No File Selected",
        description: "Please upload a file first",
        variant: "destructive",
      });
      return;
    }

    if (!title) {
      toast({
        title: "Missing Title",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    if (!assetId && !propertyId) {
      toast({
        title: "Missing Association",
        description: "Please specify an Asset ID or Property ID to link this document",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(uploadedFiles[0].uploadURL);
  };

  const selectedDocType = DOCUMENT_TYPES.find(type => type.value === documentType);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Storage</h1>
          <p className="text-muted-foreground">
            Upload and organize warranties, receipts, manuals, and inspection reports for easy access.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Document File</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                    acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadedFiles.length > 0 ? 'Replace File' : 'Choose File'}
                  </ObjectUploader>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-400">
                        ✓ {uploadedFiles[0].name} uploaded successfully
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Supported: PDF, Images (JPG, PNG), Word Documents. Max 50MB.
                  </p>
                </div>

                {/* Document Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Water Heater Warranty Certificate"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-document-title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional notes about this document..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="textarea-document-description"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Association Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Link to Asset or Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-400">
                      <strong>How to find IDs:</strong>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Asset ID: Found in the Asset Management tool or scan the asset's QR code</li>
                        <li>• Property ID: Found in the Properties section or your dashboard</li>
                        <li>• You only need to fill one of these fields</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetId">Asset ID</Label>
                  <Input
                    id="assetId"
                    placeholder="e.g., clm1234567890abcdef"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    data-testid="input-asset-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link this document to a specific asset (appliance, equipment, etc.)
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property ID</Label>
                  <Input
                    id="propertyId"
                    placeholder="e.g., clm0987654321fedcba"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    data-testid="input-property-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link this document to an entire property (general documents, property-wide warranties)
                  </p>
                </div>

                <Button 
                  onClick={handleSaveDocument}
                  disabled={uploadMutation.isPending || uploadedFiles.length === 0}
                  className="w-full mt-6"
                  data-testid="button-save-document"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Saving Document...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Save Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Document Type Info */}
            {selectedDocType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <selectedDocType.icon className="h-5 w-5" />
                    {selectedDocType.label} Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentType === 'WARRANTY' && (
                    <div className="space-y-2 text-sm">
                      <p><strong>Best Practices:</strong></p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Include warranty period and coverage details</li>
                        <li>• Attach manufacturer contact information</li>
                        <li>• Note any registration requirements</li>
                        <li>• Keep original purchase receipt with warranty</li>
                      </ul>
                    </div>
                  )}
                  
                  {documentType === 'RECEIPT' && (
                    <div className="space-y-2 text-sm">
                      <p><strong>Best Practices:</strong></p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Include purchase date and vendor information</li>
                        <li>• Note warranty activation requirements</li>
                        <li>• Keep for tax and insurance purposes</li>
                        <li>• Useful for warranty claims and resale value</li>
                      </ul>
                    </div>
                  )}
                  
                  {documentType === 'MANUAL' && (
                    <div className="space-y-2 text-sm">
                      <p><strong>Best Practices:</strong></p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Include installation and operation instructions</li>
                        <li>• Note maintenance schedules and requirements</li>
                        <li>• Keep troubleshooting guides accessible</li>
                        <li>• Essential for service technicians</li>
                      </ul>
                    </div>
                  )}
                  
                  {documentType === 'INSPECTION' && (
                    <div className="space-y-2 text-sm">
                      <p><strong>Best Practices:</strong></p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Include inspector credentials and date</li>
                        <li>• Note any required follow-up actions</li>
                        <li>• Important for insurance and compliance</li>
                        <li>• Keep for property transfer documentation</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Organize by Type</h3>
                <p className="text-sm text-muted-foreground">
                  Use document types to automatically categorize your files for easy searching.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Clear Naming</h3>
                <p className="text-sm text-muted-foreground">
                  Use descriptive titles like "HVAC Unit Warranty - 5 Year Coverage" for easy identification.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Secure Storage</h3>
                <p className="text-sm text-muted-foreground">
                  All documents are securely encrypted and only accessible by authorized users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
