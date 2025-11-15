import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Upload, Wand2, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { LogoUpload } from "@/components/LogoUpload";

interface LogoWidgetProps {
  source: "CONTRACTOR" | "HOMEOWNER" | "FLEET" | "PROPERTY_MANAGER";
  businessName?: string;
}

export function LogoWidget({ source, businessName }: LogoWidgetProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "ai">("upload");

  // Fetch user's logos
  const { data: logos, isLoading } = useQuery<any[]>({
    queryKey: ['/api/logos'],
  });

  // Filter logos for this source
  const sourceLogo = logos?.find(logo => logo.source === source && logo.isActive);

  const handleUploadSuccess = () => {
    setShowDialog(false);
    setActiveTab("upload");
  };

  return (
    <>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-cyan-50/30 to-purple-50/30 dark:from-cyan-950/10 dark:to-purple-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-2">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Custom Branding</CardTitle>
                <CardDescription>
                  Your logo on QR stickers
                </CardDescription>
              </div>
            </div>
            {sourceLogo && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Logo Display */}
          {sourceLogo ? (
            <div className="space-y-3">
              <div className="aspect-square max-w-[200px] mx-auto rounded-lg bg-white dark:bg-gray-900 border-2 border-primary/20 flex items-center justify-center p-4">
                <img 
                  src={sourceLogo.fileUrl} 
                  alt="Current logo"
                  className="max-w-full max-h-full object-contain"
                  data-testid="img-current-logo"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {sourceLogo.type === 'AI_GENERATED' ? (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </Badge>
                ) : (
                  <span>Uploaded Logo</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                No logo uploaded yet
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab("upload");
                setShowDialog(true);
              }}
              className="w-full"
              data-testid="button-upload-logo"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full"
              data-testid="button-ai-generator"
            >
              <Link href="/logos/ai-generator">
                <Wand2 className="h-4 w-4 mr-2" />
                AI Generate
              </Link>
            </Button>
          </div>

          {sourceLogo && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full"
              data-testid="button-view-all-logos"
            >
              <Link href="/logos">
                View All Logos
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upload/Generate Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-logo-upload">
          <DialogHeader>
            <DialogTitle>Add Your Logo</DialogTitle>
            <DialogDescription>
              Upload your existing logo or generate a new one with AI
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "ai")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai">
                <Wand2 className="h-4 w-4 mr-2" />
                AI Generator
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <LogoUpload
                source={source}
                businessName={businessName}
                onUploadSuccess={handleUploadSuccess}
                onCancel={() => setShowDialog(false)}
              />
            </TabsContent>
            <TabsContent value="ai" className="space-y-4">
              <div className="text-center py-8 space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-6">
                    <Wand2 className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Logo Generator</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get 4 professional logo variations created by AI for $19.99
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                  data-testid="button-open-ai-generator"
                >
                  <Link href="/logos/ai-generator" onClick={() => setShowDialog(false)}>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Open AI Generator
                  </Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
