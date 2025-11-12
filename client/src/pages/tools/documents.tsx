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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc: any) => {
                  const isImage = doc.objectPath?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isPDF = doc.objectPath?.match(/\.pdf$/i);
                  
                  return (
                    <div
                      key={doc.id}
                      className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                      data-testid={`document-card-${doc.id}`}
                    >
                      {/* Document Preview */}
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                        {isImage ? (
                          <img
                            src={doc.objectPath}
                            alt={doc.title}
                            className="w-full h-full object-cover"
                            data-testid={`document-image-${doc.id}`}
                          />
                        ) : isPDF ? (
                          <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-950/20">
                            <FileText className="h-16 w-16 text-red-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Hover Overlay - Desktop */}
                        <div className="hidden sm:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(doc.objectPath, '_blank')}
                            data-testid={`button-view-${doc.id}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.objectPath;
                              link.download = doc.title || 'document';
                              link.click();
                            }}
                            data-testid={`button-download-${doc.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        
                        {/* Quick Action Buttons - Mobile */}
                        <div className="sm:hidden absolute top-2 right-2 flex gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 shadow-lg"
                            onClick={() => window.open(doc.objectPath, '_blank')}
                            data-testid={`button-view-mobile-${doc.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 shadow-lg"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.objectPath;
                              link.download = doc.title || 'document';
                              link.click();
                            }}
                            data-testid={`button-download-mobile-${doc.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Document Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm line-clamp-2" data-testid={`document-title-${doc.id}`}>
                            {doc.title}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                            {doc.type}
                          </span>
                        </div>
                        
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {doc.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
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
