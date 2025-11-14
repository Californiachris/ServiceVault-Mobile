import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Home, 
  Sparkles, 
  Shield,
  QrCode,
  ArrowRight,
  FileText,
  Bell
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import { useEffect } from "react";
import { BenefitsSection, MarketingBenefit } from "@/components/marketing/BenefitsSection";

const homeownerBenefits: MarketingBenefit[] = [
  {
    id: "log-repairs",
    text: "Log every home repair, upgrade, and warranty in one place",
  },
  {
    id: "master-qr",
    text: "Scan your Home Master QR to save fixes instantly",
  },
  {
    id: "warranty-scan",
    text: "Scan in any warranty, for appliances, furniture, jewelry etc with ease",
  },
  {
    id: "ai-detection",
    text: "AI detects warranty, recall, and service dates and automatically sends reminders",
  },
  {
    id: "lifetime-reminders",
    text: "Get lifetime maintenance reminders for all appliances & systems",
  },
  {
    id: "home-history",
    text: "Show full home history to inspectors, insurance, and future buyers with one scan inside electrical meter box",
  },
];

export default function HomeownerWelcome() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "For Homeowners - ServiceVault";
    
    const description = "Know everything about every system in your home. Track model numbers, installations, warranties and maintenance with ServiceVault's Master QR system.";
    const url = window.location.origin + "/solutions/homeowners";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    const ogTags = [
      { property: 'og:title', content: 'For Homeowners - ServiceVault' },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: 'ServiceVault' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'For Homeowners - ServiceVault' },
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
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Home className="h-3 w-3 mr-1" />
            Homeowner
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-500/20 text-base px-4 py-2" data-testid="badge-homeowner-hero">
            <Sparkles className="h-4 w-4 mr-2" />
            Welcome to ServiceVault
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="heading-homeowner-welcome">
            Know everything about<br />every system in your home.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-homeowner-subtitle">
            One Master QR code captures all installations, warranties, and service records. AI reminds you when maintenance is due.
          </p>

          {/* Benefits with Icons */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-master-qr">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Master QR for your home</p>
                <p className="text-sm text-muted-foreground">One scan shows full property history</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-warranties">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">AI warranty parsing</p>
                <p className="text-sm text-muted-foreground">Upload docs, AI extracts dates</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-maintenance">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Automatic maintenance reminders</p>
                <p className="text-sm text-muted-foreground">Never miss a service date</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Benefits */}
        <BenefitsSection
          heading="Why Homeowners Love ServiceVault"
          eyebrow="Key Benefits"
          accentVariant="homeowner"
          benefits={homeownerBenefits}
          testIdPrefix="homeowner"
        />

        {/* How It Works - 3 Steps */}
        <div id="how-it-works" className="mt-24 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple as 1-2-3</h2>
            <p className="text-lg text-muted-foreground">Your home's complete history in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center" data-testid="step-1">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Get your Master QR code</h3>
              <p className="text-muted-foreground">One QR code for your entire property—place it in your electrical panel or utility room</p>
            </div>

            <div className="text-center" data-testid="step-2">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Upload warranties & service records</h3>
              <p className="text-muted-foreground">Take photos of receipts and manuals—AI automatically extracts key dates and info</p>
            </div>

            <div className="text-center" data-testid="step-3">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Get reminded automatically</h3>
              <p className="text-muted-foreground">ServiceVault tracks warranty expirations and sends maintenance reminders—never forget again</p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-lg px-10 py-6 shadow-xl"
              onClick={() => setLocation("/solutions/homeowners/pricing")}
              data-testid="button-view-plans"
            >
              View Plans
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
