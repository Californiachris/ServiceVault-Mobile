import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  uploadURL?: string;
  error?: string;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  acceptedFileTypes = ['*/*'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];
    
    for (let i = 0; i < selectedFiles.length && i < maxNumberOfFiles; i++) {
      const file = selectedFiles[i];
      
      // Validate file size
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
          variant: "destructive",
        });
        continue;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        progress: 0,
        status: 'pending',
      });
    }

    setFiles(prev => [...prev.slice(0, maxNumberOfFiles - newFiles.length), ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Get upload parameters
      const { url } = await onGetUploadParameters();
      
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, uploadURL: url }
          : f
      ));

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? { ...f, progress } : f
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'success' as const, progress: 100 }
                : f
            ));
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', uploadFile.file.type);
        xhr.send(uploadFile.file);
      });
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed' 
            }
          : f
      ));
      throw error;
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      await Promise.all(pendingFiles.map(uploadFile));
      
      // Call completion callback
      const successful = files
        .filter(f => f.status === 'success')
        .map(f => ({
          uploadURL: f.uploadURL!,
          name: f.file.name,
        }));
      
      onComplete?.({ successful });
      
      toast({
        title: "✓ File Uploaded Successfully",
        description: "Now fill out the form below to save your document.",
      });
      
      // Close modal after successful upload
      resetAndClose();
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetAndClose = () => {
    setFiles([]);
    setShowModal(false);
    setIsUploading(false);
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
        data-testid="button-open-uploader"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload up to {maxNumberOfFiles} file(s), max {Math.round(maxFileSize / 1024 / 1024)}MB each
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Drop Zone */}
            <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Choose files to upload</p>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop files here, or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple={maxNumberOfFiles > 1}
                    accept={acceptedFileTypes.join(',')}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="input-file-select"
                  />
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((uploadFile) => (
                  <Card key={uploadFile.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">
                            {uploadFile.file.name}
                          </p>
                          <div className="flex items-center gap-2">
                            {uploadFile.status === 'success' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {uploadFile.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadFile.id)}
                              disabled={isUploading}
                              data-testid={`button-remove-file-${uploadFile.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatFileSize(uploadFile.file.size)}</span>
                          <span className="capitalize font-medium">
                            {uploadFile.status === 'pending' && '✓ Ready to Upload'}
                            {uploadFile.status === 'uploading' && 'Uploading...'}
                            {uploadFile.status === 'success' && '✓ Upload Complete'}
                            {uploadFile.status === 'error' && '✗ Upload Failed'}
                          </span>
                        </div>
                        
                        {uploadFile.status === 'uploading' && (
                          <Progress value={uploadFile.progress} className="h-1" />
                        )}
                        
                        {uploadFile.error && (
                          <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={resetAndClose}
                disabled={isUploading}
                data-testid="button-cancel-upload"
              >
                {files.length > 0 ? 'Cancel' : 'Close'}
              </Button>
              
              <div className="flex gap-2">
                {files.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                    data-testid="button-clear-files"
                  >
                    Clear All
                  </Button>
                )}
                
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading || files.every(f => f.status !== 'pending')}
                  data-testid="button-start-upload"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Continue ({files.filter(f => f.status === 'pending').length} file{files.filter(f => f.status === 'pending').length > 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
