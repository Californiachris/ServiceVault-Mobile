import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { DocumentUploadWizard } from "@/components/DocumentUploadWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, QrCode, Camera, FileCheck, ExternalLink, Download } from "lucide-react";

export default function DocumentsPage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Fetch all user documents
  const { data: documents, isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });
  
  // QR-scanned warranty data
  const [scannedWarrantyData, setScannedWarrantyData] = useState<{
    manufacturer?: string;
    model?: string;
    serial?: string;
    qrUrl?: string;
  } | null>(null);
  
  // Check for scanned warranty data from QR scan
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const warrantyScanned = urlParams.get('warranty');
    
    if (warrantyScanned === 'scanned') {
      const warrantyDataStr = sessionStorage.getItem('scannedWarrantyData');
      if (warrantyDataStr) {
        try {
          const warrantyData = JSON.parse(warrantyDataStr);
          setScannedWarrantyData(warrantyData);
          sessionStorage.removeItem('scannedWarrantyData');
          
          toast({
            title: "Warranty Data Loaded",
            description: `${warrantyData.manufacturer} appliance information populated. Click upload button to continue.`,
          });
        } catch (error) {
          console.error('Error loading warranty data:', error);
        }
      }
    }
  }, [toast]);


  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };


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
              <CardContent className="space-y-6">
                {/* QR Scanner - Primary Action */}
                <div className="space-y-3">
                  <p className="text-base font-semibold">Fastest Option</p>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-16 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    onClick={() => {
                      window.location.href = '/scan?mode=warranty';
                    }}
                    data-testid="button-scan-warranty-qr"
                  >
                    <QrCode className="mr-3 h-6 w-6" />
                    Scan Warranty QR Code
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Scan QR code from appliance to auto-extract model, serial, and warranty info
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or Upload Manually
                    </span>
                  </div>
                </div>

                {/* File Upload - Premium Gradient Buttons with New Wizard */}
                <div className="space-y-4">
                  {/* Photo Upload Button - Bold Gradient */}
                  <DocumentUploadWizard
                    maxFileSize={50 * 1024 * 1024}
                    acceptedFileTypes={['.jpg', '.jpeg', '.png']}
                    onGetUploadParameters={handleGetUploadParameters}
                    buttonClassName="w-full h-16 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    scannedWarrantyData={scannedWarrantyData}
                  >
                    <div className="flex items-center justify-center gap-3" data-testid="button-upload-photo">
                      <Camera className="h-6 w-6" />
                      <span>Take Photo of Warranty</span>
                    </div>
                  </DocumentUploadWizard>

                  {/* PDF Upload Button - Bold Gradient */}
                  <DocumentUploadWizard
                    maxFileSize={50 * 1024 * 1024}
                    acceptedFileTypes={['.pdf', '.doc', '.docx']}
                    onGetUploadParameters={handleGetUploadParameters}
                    buttonClassName="w-full h-16 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    scannedWarrantyData={scannedWarrantyData}
                  >
                    <div className="flex items-center justify-center gap-3" data-testid="button-upload-pdf">
                      <FileText className="h-6 w-6" />
                      <span>Upload PDF Document</span>
                    </div>
                  </DocumentUploadWizard>
                  
                  <p className="text-xs text-muted-foreground">
                    Max file size: 50MB • New streamlined 2-step upload process
                  </p>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>

        {/* Uploaded Documents */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Your Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documentsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            
            {!documentsLoading && (!documents || documents.length === 0) && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No documents uploaded yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload your first warranty, receipt, or manual using the buttons above
                </p>
              </div>
            )}
            
            {!documentsLoading && documents && documents.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-8">
                {documents.map((doc: any) => {
                  const isImage = doc.mimeType?.startsWith('image/');
                  const isPDF = doc.mimeType === 'application/pdf';
                  const hasValidUrl = doc.objectPath !== null;
                  
                  return (
                    <div
                      key={doc.id}
                      className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all duration-300"
                      data-testid={`document-card-${doc.id}`}
                    >
                      {/* Document Preview - Click to Open */}
                      <div 
                        className="aspect-[16/10] bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden cursor-pointer"
                        onClick={() => hasValidUrl && window.open(doc.objectPath, '_blank')}
                      >
                        {!hasValidUrl ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                            <FileText className="h-20 w-20 text-destructive/50 mb-4" />
                            <p className="text-sm text-destructive">Preview unavailable</p>
                          </div>
                        ) : isImage ? (
                          <img
                            src={doc.objectPath}
                            alt={doc.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            data-testid={`document-image-${doc.id}`}
                          />
                        ) : isPDF ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/30">
                            <FileText className="h-24 w-24 text-red-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-24 w-24 text-muted-foreground/50" />
                          </div>
                        )}
                        
                        {/* Hover Overlay with Gradient */}
                        {hasValidUrl && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-8">
                            <p className="text-white text-sm font-medium mb-3">Click to view full size</p>
                            <div className="flex gap-3">
                              <Button
                                size="lg"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.objectPath, '_blank');
                                }}
                                className="shadow-xl"
                                data-testid={`button-view-${doc.id}`}
                              >
                                <ExternalLink className="h-5 w-5 mr-2" />
                                Open
                              </Button>
                              <Button
                                size="lg"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = document.createElement('a');
                                  link.href = doc.objectPath;
                                  link.download = doc.title || 'document';
                                  link.click();
                                }}
                                className="shadow-xl bg-white/90 dark:bg-black/90"
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-5 w-5 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Document Info - Premium Design */}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-lg line-clamp-2 leading-tight" data-testid={`document-title-${doc.id}`}>
                            {doc.title}
                          </h3>
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 rounded-full whitespace-nowrap font-medium border border-blue-200/50 dark:border-blue-800/50">
                            {doc.type}
                          </span>
                        </div>
                        
                        {doc.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {doc.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
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
                  <FileText className="text-primary h-6 w-6" />
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
