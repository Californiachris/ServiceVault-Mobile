import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import vaultLogo from "@assets/1000003104-removebg-preview_1763181118443.png";

export default function ContractorPlanSelection() {
  const [, setLocation] = useLocation();

  const handleSelectPlan = (plan: string) => {
    // For now, route to pricing page which handles subscription flow
    setLocation(`/pricing?plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={vaultLogo} 
              alt="ServiceVault Logo" 
              className="h-12 w-12 object-contain"
            />
            <span className="text-xl font-bold tracking-tight">ServiceVault™</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/contractor/welcome")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-plan-selection">
            Choose Your Plan
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the sticker pack that fits your business. All plans include contractor branding and lifetime asset tracking.
          </p>
        </div>

        {/* 3-Tier Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {/* Starter Plan */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl" data-testid="card-plan-starter">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl" data-testid="title-plan-starter">Starter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-bold" data-testid="price-starter">$49.99</div>
                <div className="text-muted-foreground">per month</div>
                <div className="text-sm font-semibold text-primary mt-1">50 contractor-branded stickers / month</div>
              </div>
              
              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">50 QR stickers with your logo each month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Each sticker links to a full asset record</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Customers scan and call your company directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Basic service reminders & asset history</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSelectPlan("contractor_starter")}
                data-testid="button-choose-starter"
              >
                Choose Starter
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan - Most Popular */}
          <Card className="border-2 border-primary shadow-2xl scale-105 relative" data-testid="card-plan-pro">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 shadow-lg">
                Most Popular
              </Badge>
            </div>
            <CardHeader className="pb-4 pt-8">
              <CardTitle className="text-2xl" data-testid="title-plan-pro">Pro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-bold text-primary" data-testid="price-pro">$69.99</div>
                <div className="text-muted-foreground">per month</div>
                <div className="text-sm font-semibold text-primary mt-1">100 contractor-branded stickers / month</div>
              </div>
              
              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">100 QR stickers with your logo each month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Perfect for growing service businesses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Advanced reminders and asset tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Best balance of volume and price</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" 
                onClick={() => handleSelectPlan("contractor_pro")}
                data-testid="button-choose-pro"
              >
                Choose Pro
              </Button>
            </CardFooter>
          </Card>

          {/* Elite Plan */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl" data-testid="card-plan-elite">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl" data-testid="title-plan-elite">Elite</CardTitle>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-4xl font-bold" data-testid="price-elite">$120</div>
                <div className="text-muted-foreground">per month</div>
                <div className="text-sm font-semibold text-primary mt-1">250 contractor-branded stickers / month</div>
              </div>
              
              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">250 QR stickers with your logo each month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">For busy teams and multi-tech companies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Maximize your repeat customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Best value per sticker</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSelectPlan("contractor_elite")}
                data-testid="button-choose-elite"
              >
                Choose Elite
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Trust Signal */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include free AI-powered maintenance reminders • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
