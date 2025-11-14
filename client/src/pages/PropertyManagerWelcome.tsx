import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Building2, 
  Sparkles, 
  Users,
  MapPin,
  ArrowRight,
  ClipboardList,
  MessageSquare
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect } from "react";

export default function PropertyManagerWelcome() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "For Property Managers - ServiceVault";
    
    const description = "Manage every property with confidence. Track worker check-ins with GPS, collect tenant reports, and maintain complete service history—even when tenants change.";
    const url = window.location.origin + "/solutions/property-managers";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'For Property Managers - ServiceVault' },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: 'ServiceVault' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'For Property Managers - ServiceVault' },
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
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            <Building2 className="h-3 w-3 mr-1" />
            Property Manager
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-500/20 text-base px-4 py-2" data-testid="badge-property-manager-hero">
            <Sparkles className="h-4 w-4 mr-2" />
            Welcome to ServiceVault
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="heading-property-manager-welcome">
            Manage every property<br />with confidence.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-property-manager-subtitle">
            Track worker check-ins with GPS, collect tenant reports via QR codes, and maintain complete service history—even when tenants change.
          </p>

          {/* Benefits with Icons */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-gps">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Worker GPS check-in/out</p>
                <p className="text-sm text-muted-foreground">Verify location and track visit times</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-tenant-reports">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Tenant report portal</p>
                <p className="text-sm text-muted-foreground">QR code for maintenance requests</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-history">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Complete service history</p>
                <p className="text-sm text-muted-foreground">Every asset, every contractor, one place</p>
              </CardContent>
            </Card>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-xl"
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
            <p className="text-lg text-muted-foreground">Property management made simple</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center" data-testid="step-1">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Add properties and workers</h3>
              <p className="text-muted-foreground">Set up your portfolio and assign maintenance staff to properties</p>
            </div>

            <div className="text-center" data-testid="step-2">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Workers check in with GPS verification</h3>
              <p className="text-muted-foreground">Track visits, tasks completed, and time on-site for every property</p>
            </div>

            <div className="text-center" data-testid="step-3">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Tenants report issues via QR</h3>
              <p className="text-muted-foreground">Place a QR code in each unit—tenants scan to submit maintenance requests</p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Button 
              size="lg"
              variant="outline"
              className="text-base px-6 py-5 border-2"
              onClick={() => setLocation("/pricing")}
              data-testid="button-manage-properties"
            >
              Start Managing Properties
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
