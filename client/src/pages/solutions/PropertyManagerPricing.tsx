import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Check, ArrowLeft, Building2, MapPin, Users } from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect } from "react";

export default function PropertyManagerPricing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Property Manager Pricing - ServiceVault";
    
    const description = "Professional property management platform with GPS worker tracking and tenant portal. $4.99/property/month with bulk discounts for large portfolios.";
    const url = window.location.origin + "/solutions/property-managers/pricing";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'Property Manager Pricing - ServiceVault' },
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
      { name: 'twitter:title', content: 'Property Manager Pricing - ServiceVault' },
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

  const handleSelectPlan = () => {
    setLocation("/pricing?plan=property_manager");
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
            onClick={() => setLocation("/solutions/property-managers")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-property-manager-pricing">
            Property Management Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade property management platform. Pay per property with automatic bulk discounts as you grow.
          </p>
        </div>

        <div className="flex justify-center max-w-2xl mx-auto">
          <Card className="border-2 border-primary shadow-2xl w-full" data-testid="card-property-manager-plan">
            <CardHeader className="pb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl" data-testid="title-property-manager-plan">Property Management</CardTitle>
              <p className="text-muted-foreground mt-2">Complete portfolio management solution</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <div className="text-5xl font-bold text-primary" data-testid="price-property-manager">$4.99</div>
                  <div className="text-muted-foreground">/ property / month</div>
                </div>
                <div className="text-sm text-muted-foreground mt-3">
                  Automatic bulk discounts at 100+, 500+, and 1000+ properties
                </div>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">GPS Worker Check-In/Out</div>
                    <p className="text-sm text-muted-foreground">Track worker arrivals with GPS verification, geofencing, and automatic visit logging with photos and notes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Tenant Issue Reporting Portal</div>
                    <p className="text-sm text-muted-foreground">Public QR codes let tenants submit maintenance requests directly - no app required for residents</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Complete service history across tenant changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Worker task assignment and tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Master QR code for each property</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Tenant report dashboard with filtering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Scales from 1 to 1000+ properties</span>
                </li>
              </ul>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm font-semibold mb-2">Bulk Pricing Discounts</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>• 100-499 properties: <span className="text-primary font-medium">10% off</span></div>
                  <div>• 500-999 properties: <span className="text-primary font-medium">20% off</span></div>
                  <div>• 1000+ properties: <span className="text-primary font-medium">30% off</span></div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                size="lg"
                onClick={handleSelectPlan}
                data-testid="button-choose-property-manager"
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            No setup fees • Automatic bulk discounts • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
