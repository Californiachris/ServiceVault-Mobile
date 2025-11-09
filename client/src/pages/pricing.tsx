import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Zap, Shield, TrendingUp, Users, Building2, Truck, Phone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>({
    homeowner: [],
    contractor: [],
    fleet: [],
  });
  const [fleetAssetCount, setFleetAssetCount] = useState<number>(100);

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, addOns, assetCount }: { plan: string; addOns?: string[]; assetCount?: number }) => {
      const response = await apiRequest("/api/stripe/create-checkout-session", "POST", {
        plan,
        addOns,
        fleetAssetCount: assetCount,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (plan: string, tier: string) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    const addOns = selectedAddOns[tier as keyof typeof selectedAddOns] || [];
    const assetCount = tier === 'fleet' ? fleetAssetCount : undefined;
    
    checkoutMutation.mutate({ plan, addOns, assetCount });
  };

  const toggleAddOn = (tier: string, addon: string) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [tier]: prev[tier as keyof typeof prev].includes(addon)
        ? prev[tier as keyof typeof prev].filter(a => a !== addon)
        : [...prev[tier as keyof typeof prev], addon],
    }));
  };

  const calculateFleetPrice = () => {
    if (fleetAssetCount >= 10000) return "Contact Sales";
    const pricePerAsset = fleetAssetCount >= 1000 ? 2 : 3;
    return `$${(fleetAssetCount * pricePerAsset).toLocaleString()}/year`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="FixTrack Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-bold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">
              FixTrack Pro
            </span>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")}>
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20" data-testid="badge-pricing-hero">
          <Sparkles className="h-3 w-3 mr-1" />
          Simple, Transparent Pricing
        </Badge>
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-pricing">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-pricing-subtitle">
          Professional asset tracking for homeowners, contractors, and fleet managers.
          <span className="block mt-2 text-primary font-semibold">
            AI Predictive Maintenance Reminders Included FREE for Everyone
          </span>
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Homeowner Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all hover:shadow-2xl" data-testid="card-plan-homeowner">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Perfect for Homes
              </Badge>
            </div>
            
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="title-plan-homeowner">
                <Shield className="h-6 w-6 text-blue-500" />
                Homeowner Pack
              </CardTitle>
              <CardDescription data-testid="description-plan-homeowner">
                Track all your home assets, warranties, and maintenance
              </CardDescription>
              <div className="mt-4">
                <div className="text-4xl font-bold" data-testid="price-homeowner-base">
                  $99
                  <span className="text-lg font-normal text-muted-foreground"> one-time</span>
                </div>
                <div className="text-xl text-muted-foreground mt-1" data-testid="price-homeowner-maintenance">
                  + $10/year maintenance
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">INCLUDED:</h4>
                <ul className="space-y-2">
                  {[
                    "1 Master Whole-House Identifier",
                    "5 Smaller Asset QR Stickers",
                    "1 Magnetic QR for Fridge/Entry",
                    "Lifetime Asset Storage",
                    "AI Warranty Scanning & Parsing",
                    "Automatic Recall Notifications",
                    "Family Multi-User Access",
                    "Ownership Transfer Support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2" data-testid={`feature-homeowner-${i}`}>
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add-ons */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-semibold text-sm">ADD-ONS:</h4>
                
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="homeowner-service"
                    checked={selectedAddOns.homeowner.includes('addon_service_sessions')}
                    onCheckedChange={() => toggleAddOn('homeowner', 'addon_service_sessions')}
                    data-testid="checkbox-addon-homeowner-service"
                  />
                  <Label htmlFor="homeowner-service" className="text-sm cursor-pointer">
                    <div className="font-medium">Verified Service Sessions</div>
                    <div className="text-xs text-muted-foreground">GPS clock-in/out for workers • $4.99/mo</div>
                  </Label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="homeowner-nanotag"
                    checked={selectedAddOns.homeowner.includes('addon_nanotag_setup')}
                    onCheckedChange={() => toggleAddOn('homeowner', 'addon_nanotag_setup')}
                    data-testid="checkbox-addon-homeowner-nanotag"
                  />
                  <Label htmlFor="homeowner-nanotag" className="text-sm cursor-pointer">
                    <div className="font-medium">NanoTag Theft Recovery</div>
                    <div className="text-xs text-muted-foreground">BLE/NFC tracking • $14.99 setup + $2/mo per asset</div>
                  </Label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="homeowner-branding"
                    checked={selectedAddOns.homeowner.includes('addon_family_branding')}
                    onCheckedChange={() => toggleAddOn('homeowner', 'addon_family_branding')}
                    data-testid="checkbox-addon-homeowner-branding"
                  />
                  <Label htmlFor="homeowner-branding" className="text-sm cursor-pointer">
                    <div className="font-medium">Custom Family Branding</div>
                    <div className="text-xs text-muted-foreground">Family name + logo on all stickers • $5 one-time</div>
                  </Label>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                size="lg"
                onClick={() => handleSubscribe('homeowner_base', 'homeowner')}
                disabled={checkoutMutation.isPending}
                data-testid="button-subscribe-homeowner"
              >
                {checkoutMutation.isPending ? "Loading..." : "Get Started"}
              </Button>
            </CardFooter>
          </Card>

          {/* Contractor Plan */}
          <Card className="relative border-2 border-primary hover:border-primary transition-all shadow-2xl scale-105" data-testid="card-plan-contractor">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 animate-pulse">
                <TrendingUp className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            
            <CardHeader className="pt-8 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="title-plan-contractor">
                <Users className="h-6 w-6 text-orange-500" />
                Contractor Pro
              </CardTitle>
              <CardDescription data-testid="description-plan-contractor">
                Turn every install into guaranteed future work
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {/* Starter vs Pro Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <div className="text-center p-3 rounded bg-background shadow-sm border">
                  <div className="text-sm font-semibold" data-testid="price-contractor-starter">$19.99/mo</div>
                  <div className="text-xs text-muted-foreground">50 Stickers</div>
                </div>
                <div className="text-center p-3 rounded bg-primary text-primary-foreground">
                  <div className="text-sm font-semibold" data-testid="price-contractor-pro">$29.99/mo</div>
                  <div className="text-xs">100 Stickers</div>
                </div>
              </div>

              {/* Value Proposition Highlight */}
              <div className="p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-orange-600 dark:text-orange-400">
                      Installation Records That Never Get Lost
                    </p>
                    <p className="text-muted-foreground">
                      Anyone scanning your stickers sees install date, installer info, warranty details, and your contact—
                      building trust & making you the first call for future service.
                    </p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400 mt-2">
                      AI Automatically Creates Future Work
                    </p>
                    <p className="text-muted-foreground">
                      When warranties are uploaded, AI extracts dates, researches the asset, and sends predictive maintenance 
                      reminders to both you and the homeowner—turning every install into recurring revenue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">INCLUDED:</h4>
                <ul className="space-y-2">
                  {[
                    "Your Logo on Every Sticker",
                    "Permanent Contact Info Display",
                    "License Verification Badge",
                    "Permanent Install History (Date, Installer, Warranty)",
                    "AI Warranty Parsing & Maintenance Predictions",
                    "Automatic Reminders for Future Service",
                    "Client & Contractor Notifications",
                    "Referral System for Upsells",
                    "Public QR Access - Anyone Can Scan for Installation Info",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2" data-testid={`feature-contractor-${i}`}>
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add-ons */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-semibold text-sm">ADD-ONS:</h4>
                
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="contractor-crew"
                    checked={selectedAddOns.contractor.includes('addon_crew_clockin')}
                    onCheckedChange={() => toggleAddOn('contractor', 'addon_crew_clockin')}
                    data-testid="checkbox-addon-contractor-crew"
                  />
                  <Label htmlFor="contractor-crew" className="text-sm cursor-pointer">
                    <div className="font-medium">Verified Crew Clock-In</div>
                    <div className="text-xs text-muted-foreground">Track crew presence • $4.99/mo per crew</div>
                  </Label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                size="lg"
                onClick={() => handleSubscribe('contractor_pro', 'contractor')}
                disabled={checkoutMutation.isPending}
                data-testid="button-subscribe-contractor-pro"
              >
                Start Pro Plan
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubscribe('contractor_starter', 'contractor')}
                disabled={checkoutMutation.isPending}
                data-testid="button-subscribe-contractor-starter"
              >
                Start Starter Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Fleet Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all hover:shadow-2xl" data-testid="card-plan-fleet">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                <Truck className="h-3 w-3 mr-1" />
                Enterprise Ready
              </Badge>
            </div>
            
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="title-plan-fleet">
                <Building2 className="h-6 w-6 text-purple-500" />
                Fleet Management
              </CardTitle>
              <CardDescription data-testid="description-plan-fleet">
                Scale with usage-based pricing
              </CardDescription>
              <div className="mt-4">
                <Input
                  type="number"
                  value={fleetAssetCount}
                  onChange={(e) => setFleetAssetCount(parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="Number of assets"
                  className="mb-2"
                  data-testid="input-fleet-asset-count"
                />
                <div className="text-3xl font-bold" data-testid="price-fleet-calculated">
                  {calculateFleetPrice()}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {fleetAssetCount < 1000 && `$3/asset for 1-999 assets`}
                  {fleetAssetCount >= 1000 && fleetAssetCount < 10000 && `$2/asset for 1,000+ assets`}
                  {fleetAssetCount >= 10000 && `Custom pricing for enterprise`}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">INCLUDED:</h4>
                <ul className="space-y-2">
                  {[
                    "Unlimited Asset Registration",
                    "Maintenance Schedule Logging",
                    "AI Predictive Reminders",
                    "Tamper & Inspection Logs",
                    "Role-Based Dashboards",
                    "Admin, Driver, Maintenance Views",
                    "Ownership History Tracking",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2" data-testid={`feature-fleet-${i}`}>
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add-ons */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-semibold text-sm">ADD-ONS:</h4>
                
                {[
                  { id: 'addon_realtime_tracking', name: 'Real-Time Tracking', price: '$1.50/mo per asset' },
                  { id: 'addon_theft_recovery', name: 'Theft Recovery & Geofencing', price: '$9.99/mo per asset' },
                  { id: 'addon_driver_accountability', name: 'Driver Accountability', price: '$9.99/mo per driver' },
                  { id: 'addon_ai_insights', name: 'Advanced AI Insights', price: '$199/year' },
                ].map((addon) => (
                  <div key={addon.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`fleet-${addon.id}`}
                      checked={selectedAddOns.fleet.includes(addon.id)}
                      onCheckedChange={() => toggleAddOn('fleet', addon.id)}
                      data-testid={`checkbox-addon-fleet-${addon.id}`}
                    />
                    <Label htmlFor={`fleet-${addon.id}`} className="text-sm cursor-pointer">
                      <div className="font-medium">{addon.name}</div>
                      <div className="text-xs text-muted-foreground">{addon.price}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
                onClick={() => handleSubscribe('fleet_base', 'fleet')}
                disabled={checkoutMutation.isPending || fleetAssetCount >= 10000}
                data-testid="button-subscribe-fleet"
              >
                {fleetAssetCount >= 10000 ? "Contact Sales" : checkoutMutation.isPending ? "Loading..." : "Get Started"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-6">Trusted by thousands of professionals</p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-50">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Instant Setup</span>
            </div>
          </div>
        </div>

        {/* FAQ/Support */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-2">Questions?</h3>
          <p className="text-muted-foreground mb-4">
            Contact us at{" "}
            <a href="mailto:trackfixes@gmail.com" className="text-primary hover:underline">
              trackfixes@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
