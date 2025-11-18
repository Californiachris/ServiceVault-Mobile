import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Image as ImageIcon, Download, Trash2, Upload, Wand2, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { LogoUpload } from "@/components/LogoUpload";
import { useState } from "react";

interface Logo {
  id: string;
  type: 'UPLOADED' | 'AI_GENERATED';
  source: string | null;
  businessName: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isActive: boolean;
  generationId: string | null;
  createdAt: string;
}

export default function LogosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Fetch user's logos
  const { data: logos, isLoading } = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
  });

  // Delete logo mutation
  const deleteMutation = useMutation({
    mutationFn: async (logoId: string) => {
      const res = await apiRequest('DELETE', `/api/logos/${logoId}`, undefined);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      toast({
        title: "Logo Deleted",
        description: "Logo has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete logo",
        variant: "destructive",
      });
    },
  });

  const handleDownload = (logo: Logo) => {
    window.open(logo.fileUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupedLogos = logos?.reduce((acc, logo) => {
    const source = logo.source || 'OTHER';
    if (!acc[source]) acc[source] = [];
    acc[source].push(logo);
    return acc;
  }, {} as Record<string, Logo[]>);

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to manage your logos
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl pb-24">
      {/* Header */}
      <div className="mb-10">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
              <ImageIcon className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2 tracking-tight">Logo Management</h1>
              <p className="text-lg text-muted-foreground">
                Manage all your custom branding assets
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-2" data-testid="button-upload-new">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Logo</DialogTitle>
                  <DialogDescription>
                    Upload your existing logo for custom-branded QR stickers
                  </DialogDescription>
                </DialogHeader>
                <LogoUpload
                  onUploadSuccess={() => setShowUploadDialog(false)}
                  onCancel={() => setShowUploadDialog(false)}
                />
              </DialogContent>
            </Dialog>
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white" asChild data-testid="button-ai-generator">
              <Link href="/logos/ai-generator">
                <Wand2 className="h-4 w-4 mr-2" />
                AI Generator
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your logos...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!logos || logos.length === 0) && (
        <Card className="backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg">
          <CardContent className="text-center py-16">
            <div className="flex justify-center mb-6">
              <div className="p-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                <ImageIcon className="h-16 w-16 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">No Logos Yet</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Upload your existing logo or generate a new one with AI to get started with custom-branded QR stickers
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="border-2" data-testid="button-upload-first">
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white" asChild data-testid="button-generate-first">
                <Link href="/logos/ai-generator">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logos Grid - Grouped by Source */}
      {!isLoading && logos && logos.length > 0 && groupedLogos && (
        <div className="space-y-6">
          {Object.entries(groupedLogos).map(([source, sourceLogos]) => (
            <div key={source}>
              <div className="mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  {source === 'CONTRACTOR' ? 'Contractor' :
                   source === 'HOMEOWNER' ? 'Homeowner' :
                   source === 'FLEET' ? 'Fleet' :
                   source === 'PROPERTY_MANAGER' ? 'Property Manager' :
                   'Other'} Logos
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sourceLogos.length} logo{sourceLogos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sourceLogos.map((logo) => (
                  <Card 
                    key={logo.id}
                    className={`overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg ${
                      logo.isActive ? 'border-2 border-primary ring-2 ring-primary/20' : ''
                    }`}
                    data-testid={`card-logo-${logo.id}`}
                  >
                    <CardContent className="p-0">
                      {/* Logo Preview */}
                      <div className="aspect-square bg-white dark:bg-gray-900 flex items-center justify-center p-8 relative">
                        <img 
                          src={logo.fileUrl} 
                          alt={logo.fileName}
                          className="max-w-full max-h-full object-contain"
                        />
                        {logo.isActive && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary">
                            {logo.type === 'AI_GENERATED' ? (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Generated
                              </>
                            ) : (
                              'Uploaded'
                            )}
                          </Badge>
                        </div>
                      </div>

                      {/* Logo Details */}
                      <div className="p-4 border-t space-y-3">
                        <div>
                          <p className="font-medium truncate" title={logo.fileName}>
                            {logo.fileName}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                            <span>{logo.fileType.split('/')[1].toUpperCase()}</span>
                            <span>{formatFileSize(logo.fileSize)}</span>
                          </div>
                          {logo.businessName && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {logo.businessName}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleDownload(logo)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            data-testid={`button-download-${logo.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            onClick={() => deleteMutation.mutate(logo.id)}
                            variant="outline"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${logo.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
