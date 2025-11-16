import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Download,
  Palette,
  Wand2,
  Building2,
  ArrowLeft,
  CreditCard,
  Info
} from "lucide-react";
import { Link } from "wouter";

interface Logo {
  id: string;
  url: string;
  style: string;
  description: string;
}

interface Generation {
  id: string;
  businessName: string;
  industry: string | null;
  colors: string[] | null;
  style: string | null;
  logos: Logo[];
  selectedLogoId: string | null;
  createdAt: string;
}

export default function AILogoGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [keywords, setKeywords] = useState("");
  const [style, setStyle] = useState("modern");
  
  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'payment' | 'generating' | 'complete'>('idle');
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);
  
  // Check if user has paid for logo generation
  const { data: hasAccess, isLoading: checkingAccess } = useQuery({
    queryKey: ['/api/logos/check-access'],
    enabled: !!user,
  });

  // Check if Stripe is configured (demo mode)
  const [isDemoMode, setIsDemoMode] = useState(false);
  useEffect(() => {
    // Demo mode if no Stripe key is configured
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    setIsDemoMode(!stripeKey);
  }, []);

  // Create Stripe checkout
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/logos/checkout', {});
      return await res.json() as { url: string; demoMode?: boolean };
    },
    onSuccess: (data) => {
      if (data.demoMode) {
        toast({
          title: "Demo Mode Active",
          description: "Stripe is not configured. You can generate logos for free in demo mode!",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/logos/check-access'] });
        setShowPaymentModal(false);
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not create checkout session",
        variant: "destructive",
      });
    },
  });

  // Generate logos mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerationStatus('generating');
      const res = await apiRequest('POST', '/api/logos/generate', {
        businessName,
        industry: industry || undefined,
        colors: colors.length > 0 ? colors : undefined,
        style: style ? style.toUpperCase() : undefined,
        keywords: keywords || undefined,
      });
      return await res.json() as Generation;
    },
    onSuccess: (data) => {
      setCurrentGeneration(data);
      setGenerationStatus('complete');
      toast({
        title: "Logos Generated!",
        description: "4 professional logo variations are ready. Select your favorite!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/logos/generations'] });
    },
    onError: (error: any) => {
      setGenerationStatus('idle');
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate logos. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Select logo mutation
  const selectMutation = useMutation({
    mutationFn: async (logoIndex: number) => {
      if (!currentGeneration) return;
      const res = await apiRequest('POST', '/api/logos/select', {
        generationId: currentGeneration.id,
        logoIndex,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logo Selected!",
        description: "Your logo has been saved. Admin has been notified for sticker fulfillment.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logos/generations'] });
      
      // If user came from checkout, redirect to dashboard
      const fromCheckout = sessionStorage.getItem('fromCheckout');
      if (fromCheckout) {
        sessionStorage.removeItem('fromCheckout');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500); // Short delay to show success message
      }
    },
    onError: (error: any) => {
      toast({
        title: "Selection Failed",
        description: error.message || "Failed to select logo",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!businessName) {
      toast({
        title: "Business Name Required",
        description: "Please enter your business name",
        variant: "destructive",
      });
      return;
    }

    // Check if user has access or is in demo mode
    if (!hasAccess && !isDemoMode) {
      setShowPaymentModal(true);
      return;
    }

    generateMutation.mutate();
  };

  const handleSelectLogo = (index: number) => {
    setSelectedLogoIndex(index);
    selectMutation.mutate(index);
  };

  const addColor = () => {
    if (colorInput && !colors.includes(colorInput) && colors.length < 5) {
      setColors([...colors, colorInput]);
      setColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to use ServiceVault™ AI Logo Generator
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-3">
            <Wand2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ServiceVault™ AI Logo Generator</h1>
            <p className="text-muted-foreground">
              Professional logos powered by advanced AI
            </p>
          </div>
        </div>
        {isDemoMode && (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <Info className="h-3 w-3 mr-1" />
            Demo Mode - Free Generations
          </Badge>
        )}
      </div>

      {/* Main Content */}
      {generationStatus === 'complete' && currentGeneration ? (
        // Show Results
        <div className="space-y-6">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-cyan-50/30 to-purple-50/30 dark:from-cyan-950/10 dark:to-purple-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Logo Variations
              </CardTitle>
              <CardDescription>
                Select your favorite design. We'll prepare custom-branded QR stickers!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {currentGeneration.logos.map((logo, index) => (
                  <Card 
                    key={index}
                    className={`
                      overflow-hidden cursor-pointer transition-all duration-200
                      ${selectedLogoIndex === index 
                        ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                        : 'hover:shadow-md hover:scale-[1.01]'
                      }
                    `}
                    onClick={() => !selectMutation.isPending && handleSelectLogo(index)}
                    data-testid={`card-logo-${index}`}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square bg-white dark:bg-gray-900 flex items-center justify-center p-8 relative">
                        <img 
                          src={logo.url} 
                          alt={logo.description}
                          className="max-w-full max-h-full object-contain"
                        />
                        {selectedLogoIndex === index && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 border-t">
                        <Badge variant="secondary" className="mb-2">
                          {logo.style}
                        </Badge>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {logo.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setGenerationStatus('idle');
                    setCurrentGeneration(null);
                    setSelectedLogoIndex(null);
                  }}
                  data-testid="button-generate-new"
                >
                  Generate New Logos
                </Button>
                {selectedLogoIndex !== null && (
                  <Button
                    onClick={() => {
                      const selectedLogo = currentGeneration.logos[selectedLogoIndex];
                      window.open(selectedLogo.url, '_blank');
                    }}
                    variant="outline"
                    data-testid="button-download-selected"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : generationStatus === 'generating' ? (
        // Show Generating State
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardContent className="p-12 text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                <div className="relative rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-8 animate-pulse">
                  <Wand2 className="h-20 w-20 text-primary animate-[spin_3s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Creating Your Logos...
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-lg">
                ServiceVault™ AI is crafting 4 professional logo variations for {businessName}
              </p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={66} className="h-3 bg-gradient-to-r from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950" />
              <p className="text-sm text-muted-foreground font-medium">
                This usually takes 30-60 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show Form
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Logo Details
            </CardTitle>
            <CardDescription>
              Tell us about your business and preferred style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="business-name">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business-name"
                placeholder="e.g., ServiceVault, Acme Corp"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                data-testid="input-business-name"
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry" data-testid="select-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <Label>Preferred Colors (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., blue, #00D9FF, rgb(0,217,255)"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                  data-testid="input-color"
                />
                <Button onClick={addColor} variant="outline" type="button" data-testid="button-add-color">
                  Add
                </Button>
              </div>
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {colors.map(color => (
                    <Badge 
                      key={color} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeColor(color)}
                      data-testid={`badge-color-${color}`}
                    >
                      {color} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Description/Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords">Logo Description (Optional)</Label>
              <Input
                id="keywords"
                placeholder="e.g., tools, strength, mountains, reliability"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                data-testid="input-keywords"
              />
              <p className="text-xs text-muted-foreground">
                Describe what you want in your logo - specific objects, themes, or concepts
              </p>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>Design Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger data-testid="select-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern & Minimal</SelectItem>
                  <SelectItem value="professional">Professional & Corporate</SelectItem>
                  <SelectItem value="playful">Playful & Creative</SelectItem>
                  <SelectItem value="elegant">Elegant & Sophisticated</SelectItem>
                  <SelectItem value="bold">Bold & Dynamic</SelectItem>
                  <SelectItem value="vintage">Vintage & Classic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={generateMutation.isPending || checkingAccess}
              data-testid="button-generate-logos"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 mr-2" />
                  Generate 4 Logo Variations
                </>
              )}
            </Button>

            {!isDemoMode && !hasAccess && (
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <CreditCard className="h-5 w-5 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  One-time payment of $19.99 • Unlimited generations until you pick one
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Logo Generation
            </DialogTitle>
            <DialogDescription>
              Professional AI-generated logos for your business
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-950/20 dark:to-purple-950/20 p-6 rounded-lg border-2 border-primary/20">
              <div className="text-center space-y-2">
                <p className="text-4xl font-bold">$19.99</p>
                <p className="text-sm text-muted-foreground">One-time payment</p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>4 professional logo variations per generation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Unlimited generations until you pick one</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Powered by ServiceVault™ AI</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>High-resolution downloads</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Custom-branded QR sticker fulfillment</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => checkoutMutation.mutate()}
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
              size="lg"
              disabled={checkoutMutation.isPending}
              data-testid="button-checkout"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Continue to Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
