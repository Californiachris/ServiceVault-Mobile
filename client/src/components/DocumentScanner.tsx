import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";

interface ExtractedData {
  assetName?: string;
  assetBrand?: string;
  assetModel?: string;
  assetSerial?: string;
  assetCategory?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyDuration?: string;
  installDate?: string;
  purchaseDate?: string;
  price?: string;
  vendor?: string;
  notes?: string;
}

interface DocumentScannerProps {
  onDataExtracted: (data: ExtractedData) => void;
  extractionType: "asset" | "warranty" | "receipt";
}

export function DocumentScanner({ onDataExtracted, extractionType }: DocumentScannerProps) {
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ uploadURL: string; name: string; objectPath?: string } | null>(null);
  const [objectPath, setObjectPath] = useState<string | null>(null);

  const extractMutation = useMutation({
    mutationFn: async (objPath: string) => {
      const response = await apiRequest("POST", "/api/ai/documents/extract", {
        objectPath: objPath,
        extractionType,
      });
      return response.json();
    },
    onSuccess: (data: ExtractedData) => {
      toast({
        title: "Document Scanned Successfully",
        description: "AI extracted the information. Please review and confirm.",
      });
      onDataExtracted(data);
      setShowScanner(false);
      setUploadedFile(null);
      setObjectPath(null);
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract data from document",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    setObjectPath(data.objectPath);
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: { successful: Array<{ uploadURL: string; name: string }> }) => {
    if (result.successful.length > 0 && objectPath) {
      const file = result.successful[0];
      setUploadedFile({ ...file, objectPath });
      extractMutation.mutate(objectPath);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowScanner(true)}
        size="lg"
        className="w-full h-auto py-6 text-base"
        data-testid="button-scan-document"
      >
        <Camera className="mr-2 h-5 w-5" />
        Scan {extractionType === "asset" ? "Warranty/Receipt" : "Document"}
      </Button>

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-2xl" data-testid="dialog-document-scanner">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Scan Document with AI</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowScanner(false)}
                data-testid="button-close-scanner"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {extractMutation.isPending ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-2">AI is analyzing your document...</h3>
                      <p className="text-sm text-muted-foreground">
                        This may take a few seconds. We're extracting warranty info, asset details, and dates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-400 space-y-2">
                        <p className="font-semibold">How AI Scanning Works:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Take a photo or upload a warranty certificate, receipt, or manual</li>
                          <li>• Our AI automatically extracts brand, model, serial number, dates, and warranty info</li>
                          <li>• Review the extracted data and make any corrections needed</li>
                          <li>• Save to complete your {extractionType} record</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Upload Document Photo</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={50 * 1024 * 1024}
                    acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full h-32"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8" />
                      <div className="text-center">
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, JPG, PNG (max 50MB)
                        </p>
                      </div>
                    </div>
                  </ObjectUploader>

                  {uploadedFile && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <p className="text-sm text-green-400 font-medium">
                          {uploadedFile.name} uploaded successfully
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowScanner(false);
                      setUploadedFile(null);
                    }}
                    data-testid="button-cancel-scan"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
