import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CheckoutPageProps {
  plan: string;
  planPrice: string;
  planName: string;
  sector: "homeowner" | "contractor" | "fleet" | "property_manager";
}

const SECTOR_MESSAGING = {
  homeowner: {
    title: "Upload Your Family Crest or Photos",
    subtitle: "Add your family branding to all your asset QR codes",
    aiOption: "Or let AI create a custom family logo - $19.99",
  },
  contractor: {
    title: "Upload Your Business Logo",
    subtitle: "Brand all your installations with your company logo",
    aiOption: "Or generate professional contractor branding - $19.99",
  },
  fleet: {
    title: "Upload Your Company Logo",
    subtitle: "Brand all your fleet equipment with your logo",
    aiOption: "Or generate fleet branding - $19.99",
  },
  property_manager: {
    title: "Upload Your Property Management Logo",
    subtitle: "Brand all your properties and assets",
    aiOption: "Or generate professional branding - $19.99",
  },
};

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [useAI, setUseAI] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get checkout session data from query params
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "contractor_pro";
  const sector = (params.get("sector") || "contractor") as keyof typeof SECTOR_MESSAGING;
  
  // Parse plan details
  const planDetails = getPlanDetails(plan);
  const messaging = SECTOR_MESSAGING[sector];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      toast({
        title: "Logo uploaded",
        description: "Your logo is ready to be saved.",
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get upload URL from backend
      const initResponse = await apiRequest('POST', '/api/logos/upload', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        source: sector.toUpperCase(),
      });
      const { uploadURL, logoId } = await initResponse.json();

      // Step 2: Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Complete the upload (activates the logo)
      await apiRequest('POST', '/api/logos/upload/complete', {
        logoId,
      });

      return { logoId };
    },
  });

  const handleContinue = async () => {
    setIsProcessing(true);

    try {
      // If user uploaded a logo, save it first
      if (uploadedFile && !useAI) {
        await uploadLogoMutation.mutateAsync(uploadedFile);
        // Invalidate logos cache so dashboard shows new logo
        queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
        toast({
          title: "Logo saved!",
          description: "Your branding has been applied to your account.",
        });
        // Short delay to let cache update
        await new Promise(resolve => setTimeout(resolve, 500));
        setLocation("/dashboard");
        return;
      }

      // If user selected AI generator
      if (useAI) {
        // In demo mode, skip payment and go straight to generator
        toast({
          title: "Demo Mode - AI Logo Generator",
          description: "Redirecting to create your professional logos...",
        });
        // Store flag that user came from checkout
        sessionStorage.setItem("fromCheckout", "true");
        setLocation("/logos/generator");
        return;
      }

      // No logo selected, continue to dashboard
      toast({
        title: "All set!",
        description: "Welcome to your dashboard.",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPrice = useAI 
    ? `$${(parseFloat(planDetails.price) + 19.99).toFixed(2)}`
    : `$${planDetails.price}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold mb-2" data-testid="heading-checkout">
              Complete Your Setup
            </CardTitle>
            <p className="text-muted-foreground">
              Add your branding to complete your professional account
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Subscription Summary */}
            <div className="bg-muted/30 rounded-xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">{planDetails.name}</span>
                <span className="text-2xl font-bold" data-testid="text-plan-price">
                  ${planDetails.price}
                </span>
              </div>
              {useAI && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex justify-between items-center pt-3 border-t"
                >
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Logo Generator
                  </span>
                  <span className="font-semibold" data-testid="text-ai-price">$19.99</span>
                </motion.div>
              )}
              <div className="flex justify-between items-center pt-3 border-t font-bold text-xl">
                <span>Total</span>
                <span className="text-primary" data-testid="text-total-price">{totalPrice}</span>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-xl mb-2">{messaging.title}</h3>
                <p className="text-sm text-muted-foreground">{messaging.subtitle}</p>
              </div>

              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200 hover:border-primary/50 hover:bg-muted/30
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${uploadedFile ? 'border-green-500 bg-green-500/5' : ''}
                `}
                data-testid="dropzone-logo-upload"
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  {uploadedFile ? (
                    <>
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                      <div>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {uploadedFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click to change file
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">
                          {isDragActive ? "Drop your logo here" : "Drop your logo or click to browse"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports PNG, JPG, or PDF files
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AI Generator Option */}
              <div className="flex items-center space-x-3 p-4 rounded-lg border bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <Checkbox
                  id="ai-generator"
                  checked={useAI}
                  onCheckedChange={(checked) => setUseAI(checked as boolean)}
                  data-testid="checkbox-ai-generator"
                />
                <Label
                  htmlFor="ai-generator"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">{messaging.aiOption}</span>
                </Label>
              </div>

              {useAI && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-sm"
                >
                  <p className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>
                      You'll generate 4 professional logo variations and can regenerate as many times as you want until you find the perfect one.
                    </span>
                  </p>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                className="flex-1"
                data-testid="button-skip"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleContinue}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-continue"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue (Demo)"
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Demo mode - No payment required. In production, this will process your payment securely via Stripe.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function getPlanDetails(plan: string) {
  const plans: Record<string, { name: string; price: string }> = {
    contractor_starter: { name: "Contractor Starter", price: "49.99" },
    contractor_pro: { name: "Contractor Pro", price: "69.99" },
    contractor_elite: { name: "Contractor Elite", price: "99.99" },
    homeowner_base: { name: "Homeowner Plan", price: "99.00" },
    fleet_base: { name: "Fleet Management", price: "299.00" },
    property_manager_base: { name: "Property Management", price: "49.90" },
  };

  return plans[plan] || { name: "Subscription Plan", price: "0.00" };
}
