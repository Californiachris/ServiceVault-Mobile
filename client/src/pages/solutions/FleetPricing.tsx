import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Check, ArrowLeft, Truck, TrendingDown, Zap } from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FleetOnboardingForm } from "@/components/onboarding/FleetOnboardingForm";

export default function FleetPricing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [onboardingModal, setOnboardingModal] = useState<{ plan: string } | null>(null);

  useEffect(() => {
    document.title = "Fleet Management Pricing - ServiceVault";
    
    const description = "Predictive maintenance and cost forecasting for your fleet. Just $4.99/asset/month. Reduce breakdowns and keep every vehicle on schedule.";
    const url = window.location.origin + "/solutions/fleet/pricing";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'Fleet Management Pricing - ServiceVault' },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Fleet Management Pricing - ServiceVault' },
      { name: 'twitter:description', content: description },
    ];

    twitterTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });
  }, []);

  const onboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/onboarding/complete", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ServiceVault!",
        description: "Your account has been set up successfully.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete sign-up",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = async () => {
    if (!isAuthenticated) {
      try {
        await fetch('/api/auth/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tier: 'fleet' }),
        });
      } catch (error) {
        console.error("Error storing tier selection:", error);
      }
      window.location.href = '/api/login';
      return;
    }
    setOnboardingModal({ plan: 'fleet' });
  };

  const handleOnboardingComplete = async (data: any) => {
    if (!onboardingModal) return;
    try {
      await onboardingMutation.mutateAsync({
        plan: onboardingModal.plan,
        ...data,
      });
      setOnboardingModal(null);
    } catch (error) {
      // Keep modal open on error so user can fix and retry
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={serviceVaultLogo} 
              alt="ServiceVault Logo" 
              className="h-12 w-12 object-contain"
            />
            <span className="text-xl font-bold tracking-tight">ServiceVault</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/solutions/fleet")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-fleet-pricing">
            Fleet Management Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple per-asset pricing with powerful AI-driven maintenance forecasting. Keep your entire fleet running optimally.
          </p>
        </div>

        <div className="flex justify-center max-w-2xl mx-auto">
          <Card className="border-2 border-primary shadow-2xl w-full" data-testid="card-fleet-plan">
            <CardHeader className="pb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <Truck className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl" data-testid="title-fleet-plan">Fleet Management</CardTitle>
              <p className="text-muted-foreground mt-2">Per-asset pricing that scales with you</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <div className="text-5xl font-bold text-primary" data-testid="price-fleet">$4.99</div>
                  <div className="text-muted-foreground">/ asset / month</div>
                </div>
                <div className="text-sm text-muted-foreground mt-3">
                  Track trucks, equipment, tools, and vehicles
                </div>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">AI-Powered Predictive Maintenance</div>
                    <p className="text-sm text-muted-foreground">Machine learning analyzes your fleet's usage patterns and predicts maintenance needs before breakdowns happen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Cost Forecasting & Analytics</div>
                    <p className="text-sm text-muted-foreground">Get accurate predictions on upcoming maintenance costs, replacement schedules, and budget planning</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Complete maintenance history for every asset</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Automated service reminders and alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Real-time cost tracking per vehicle/asset</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Warranty tracking and expiration alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Reduce downtime and maximize uptime</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                size="lg"
                onClick={handleSelectPlan}
                data-testid="button-choose-fleet"
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            No setup fees • Pay only for active assets • Cancel anytime
          </p>
        </div>
      </div>

      <FleetOnboardingForm
        open={!!onboardingModal}
        onClose={() => setOnboardingModal(null)}
        onComplete={handleOnboardingComplete}
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || undefined}
        userEmail={user?.email || undefined}
      />
    </div>
  );
}
