import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LogoUploadProps {
  source?: string;
  businessName?: string;
  onUploadSuccess?: (logoId: string, fileUrl: string) => void;
  onCancel?: () => void;
}

const ACCEPTED_FORMATS = {
  'image/png': ['.png'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function LogoUpload({ source, businessName, onUploadSuccess, onCancel }: LogoUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setErrorMessage('File size must be less than 10MB');
      } else if (error.code === 'file-invalid-type') {
        setErrorMessage('Please upload a PNG, SVG, or PDF file');
      } else {
        setErrorMessage(error.message);
      }
      setUploadStatus('error');
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);

      // Step 1: Initiate upload and get signed URL
      const initRes = await apiRequest('POST', '/api/logos/upload', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        source,
        businessName,
      });
      const initResponse = await initRes.json() as {
        uploadURL: string;
        logoId: string;
        objectPath: string;
      };

      setUploadProgress(30);

      // Step 2: Upload file to signed URL
      const uploadResult = await fetch(initResponse.uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setUploadProgress(100);
      setUploadStatus('success');

      // Invalidate queries to refresh logo data
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });

      toast({
        title: "Logo uploaded successfully!",
        description: "Your logo has been saved and admin has been notified.",
      });

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(initResponse.logoId, initResponse.objectPath);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Failed to upload logo');
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-cyan-50/50 to-purple-50/50 dark:from-cyan-950/10 dark:to-purple-950/10">
      <CardContent className="p-6">
        {/* Status: Success */}
        {uploadStatus === 'success' && (
          <div className="text-center space-y-4" data-testid="upload-success">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Logo Uploaded Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Admin has been notified and will process your custom-branded stickers.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleReset} variant="outline" data-testid="button-upload-another">
                Upload Another
              </Button>
              {onCancel && (
                <Button onClick={onCancel} data-testid="button-done">
                  Done
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Status: Uploading */}
        {uploadStatus === 'uploading' && (
          <div className="space-y-4" data-testid="upload-progress">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Uploading logo...</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {uploadProgress < 50 ? 'Preparing upload...' : 'Finalizing...'}
            </p>
          </div>
        )}

        {/* Status: Idle or Error - Show Upload Interface */}
        {(uploadStatus === 'idle' || uploadStatus === 'error') && (
          <div className="space-y-4">
            {/* Error Message */}
            {uploadStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg" data-testid="upload-error">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">Upload Failed</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* File Preview or Drop Zone */}
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive 
                    ? 'border-primary bg-primary/5 scale-[0.99]' 
                    : 'border-primary/30 hover:border-primary/50 hover:bg-accent/50'
                  }
                `}
                data-testid="dropzone-upload"
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {isDragActive ? 'Drop your logo here' : 'Upload your logo'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drag and drop, or click to browse
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary">PNG</Badge>
                    <Badge variant="secondary">SVG</Badge>
                    <Badge variant="secondary">PDF</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Preview Card */}
                <Card className="overflow-hidden border-2 border-primary/20" data-testid="file-preview">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {previewUrl ? (
                          <div className="w-24 h-24 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                            <img 
                              src={previewUrl} 
                              alt="Logo preview" 
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid="text-filename">
                              {selectedFile.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                            <Badge variant="outline" className="mt-2">
                              {selectedFile.type.split('/')[1].toUpperCase()}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleReset}
                            className="flex-shrink-0"
                            data-testid="button-remove-file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                    size="lg"
                    data-testid="button-upload"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Logo
                  </Button>
                  {onCancel && (
                    <Button onClick={onCancel} variant="outline" size="lg" data-testid="button-cancel">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
