import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Check, ArrowLeft, Home, Shield, Sparkles } from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect } from "react";

export default function HomeownerPricing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Homeowner Pricing - ServiceVault";
    
    const description = "Complete property history system with Master QR code. One-time setup $99 + $10/year renewal. Track warranties, maintenance, and service records forever.";
    const url = window.location.origin + "/solutions/homeowners/pricing";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'Homeowner Pricing - ServiceVault' },
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
      { name: 'twitter:title', content: 'Homeowner Pricing - ServiceVault' },
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
    setLocation("/pricing?plan=homeowner");
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
            onClick={() => setLocation("/solutions/homeowners")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-homeowner-pricing">
            Homeowner Pack Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Complete property history system with your Master QR code. Track warranties, maintenance, and service records forever.
          </p>
        </div>

        <div className="flex justify-center max-w-2xl mx-auto">
          <Card className="border-2 border-primary shadow-2xl w-full" data-testid="card-homeowner-plan">
            <CardHeader className="pb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Home className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl" data-testid="title-homeowner-plan">Homeowner Pack</CardTitle>
              <p className="text-muted-foreground mt-2">Complete property history system</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <div className="text-5xl font-bold text-primary" data-testid="price-homeowner-setup">$99</div>
                  <div className="text-muted-foreground">one-time setup</div>
                </div>
                <div className="text-lg text-muted-foreground mt-2">
                  + <span className="font-semibold text-primary" data-testid="price-homeowner-annual">$10/year</span> renewal
                </div>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Master QR Code System</div>
                    <p className="text-sm text-muted-foreground">One QR code to access your complete property history - warranties, service records, and maintenance logs</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">AI-Powered Warranty Parsing</div>
                    <p className="text-sm text-muted-foreground">Upload receipts and warranties - our AI extracts dates and creates automatic maintenance reminders</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited asset tracking for your property</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Upload and store warranties & receipts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Automatic maintenance reminders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Complete service history timeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Increases property resale value</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600" 
                size="lg"
                onClick={handleSelectPlan}
                data-testid="button-choose-homeowner"
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            One-time setup includes Master QR code creation • Annual renewal keeps your records accessible forever
          </p>
        </div>
      </div>
    </div>
  );
}
