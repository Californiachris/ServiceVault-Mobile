import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Truck, 
  Sparkles, 
  TrendingUp,
  Shield,
  ArrowRight,
  Calendar,
  AlertTriangle
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect } from "react";

export default function FleetWelcome() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "For Fleet Management - ServiceVault";
    
    const description = "Keep your fleet running with predictive maintenance, cost forecasting, and automated service tracking. Reduce breakdowns and keep every vehicle on schedule.";
    const url = window.location.origin + "/solutions/fleet";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'For Fleet Management - ServiceVault' },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: 'ServiceVault' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'For Fleet Management - ServiceVault' },
      { name: 'twitter:description', content: description },
    ];
    
    ogTags.forEach(tag => {
      const attr = tag.property ? 'property' : 'name';
      const attrValue = tag.property || tag.name;
      let metaTag = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attr, attrValue);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', tag.content);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
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
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <Truck className="h-3 w-3 mr-1" />
            Fleet Management
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 border-green-500/20 text-base px-4 py-2" data-testid="badge-fleet-hero">
            <Sparkles className="h-4 w-4 mr-2" />
            Welcome to ServiceVault
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="heading-fleet-welcome">
            Keep your fleet running.<br />Stay ahead of maintenance.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-fleet-subtitle">
            Track every vehicle and asset automatically. AI predicts maintenance needs, forecasts costs, and keeps your fleet compliant.
          </p>

          {/* Benefits with Icons */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-predictive">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Predictive maintenance</p>
                <p className="text-sm text-muted-foreground">AI forecasts breakdowns before they happen</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-forecasting">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Cost forecasting</p>
                <p className="text-sm text-muted-foreground">Budget accurately with spend predictions</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-compliance">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Compliance tracking</p>
                <p className="text-sm text-muted-foreground">Stay audit-ready with complete records</p>
              </CardContent>
            </Card>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-xl"
              onClick={() => setLocation("/pricing")}
              data-testid="button-get-started"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-lg px-8 py-6 border-2"
              onClick={() => setLocation("/pricing")}
              data-testid="button-view-pricing"
            >
              View Pricing
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            <button 
              className="underline hover:text-primary transition-colors"
              onClick={() => {
                const howItWorks = document.getElementById('how-it-works');
                howItWorks?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-how-it-works-scroll"
            >
              See how it works (30-second overview)
            </button>
          </p>
        </div>

        {/* How It Works - 3 Steps */}
        <div id="how-it-works" className="mt-24 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple as 1-2-3</h2>
            <p className="text-lg text-muted-foreground">Fleet tracking made effortless</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center" data-testid="step-1">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Add your vehicles and assets</h3>
              <p className="text-muted-foreground">Onboard your fleet in minutes—import from CSV or enter manually</p>
            </div>

            <div className="text-center" data-testid="step-2">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Log service history automatically</h3>
              <p className="text-muted-foreground">Scan QR codes on each unit to instantly record maintenance and repairs</p>
            </div>

            <div className="text-center" data-testid="step-3">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">AI predicts and reminds</h3>
              <p className="text-muted-foreground">Get alerts before breakdowns happen and forecast your maintenance budget</p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Button 
              size="lg"
              variant="outline"
              className="text-base px-6 py-5 border-2"
              onClick={() => setLocation("/pricing")}
              data-testid="button-start-tracking"
            >
              Start Tracking Your Fleet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
